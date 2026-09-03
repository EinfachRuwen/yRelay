const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db, getSetting, setSetting, logAudit } = require('../db');
const { sendeFreieNachricht } = require('../services/poke');
const crypto = require('crypto');

const router = express.Router();
router.use(requireAuth);

function pruefeSchulZugriff(req, res) {
  if (getSetting('schul_dashboard_enabled') !== 'true') {
    res.status(404).json({ fehler: 'Das Schul-Dashboard ist deaktiviert.' });
    return false;
  }
  if (!req.user.has_schul_access) {
    res.status(403).json({ fehler: 'Kein Zugriff auf das Schul-Dashboard.' });
    return false;
  }
  return true;
}

function holeSchulProfil(req) {
  if (req.user.schul_poke_profile_id) {
    return db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(req.user.schul_poke_profile_id);
  }
  return db.prepare('SELECT * FROM poke_profiles WHERE ist_standard = 1 LIMIT 1').get();
}

function holeOderErzeugeIntegration(req) {
  const profil = holeSchulProfil(req);
  if (!profil) return null;

  let integration = db.prepare(`
    SELECT * FROM schul_integrationen WHERE nutzer_id = ? AND profil_id = ?
  `).get(req.user.id, profil.id);
  if (!integration) {
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare(`
      INSERT INTO schul_integrationen (nutzer_id, profil_id, token) VALUES (?, ?, ?)
    `).run(req.user.id, profil.id, token);
    integration = db.prepare(`
      SELECT * FROM schul_integrationen WHERE nutzer_id = ? AND profil_id = ?
    `).get(req.user.id, profil.id);
  }
  return { profil, integration };
}

function istFerienHeute() {
  let ferien = [];
  try { ferien = JSON.parse(getSetting('schul_ferien') || '[]'); } catch (e) {}
  const heute = heutigesDatum();
  return ferien.some(zeitraum => zeitraum.von <= heute && heute <= zeitraum.bis);
}

function heutigesDatum() {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: getSetting('schul_zeitzone') || 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  return `${teile.find(t => t.type === 'year').value}-${teile.find(t => t.type === 'month').value}-${teile.find(t => t.type === 'day').value}`;
}

function istAutomatischeSchulzeit() {
  if (istFerienHeute()) return false;
  const zeitzone = getSetting('schul_zeitzone') || 'Europe/Berlin';
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: zeitzone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const wochentag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(teile.find(t => t.type === 'weekday').value);
  const wochentage = (getSetting('schul_wochentage') || '1,2,3,4,5').split(',').map(Number);
  if (!wochentage.includes(wochentag)) return false;
  const minuten = Number(teile.find(t => t.type === 'hour').value) * 60 + Number(teile.find(t => t.type === 'minute').value);
  const [startStunde, startMinute] = (getSetting('schul_startzeit') || '08:00').split(':').map(Number);
  const [endeStunde, endeMinute] = (getSetting('schul_endzeit') || '15:00').split(':').map(Number);
  return minuten >= startStunde * 60 + startMinute && minuten < endeStunde * 60 + endeMinute;
}

function istSchulmodusAktiv(integration) {
  if (integration.modus === 'manual_on') return true;
  if (integration.modus === 'manual_off') return false;
  return istAutomatischeSchulzeit();
}

async function sendeSchulNachricht(user, inhalt, profil) {
  const replyToken = crypto.randomBytes(16).toString('hex');
  const insert = db.prepare(`
    INSERT INTO messages (user_id, type, content, poke_payload, status, reply_token, poke_profile_id)
    VALUES (?, 'school', ?, '', 'wird_gesendet', ?, ?)
  `).run(user.id, inhalt, replyToken, profil?.id || null);
  const messageId = insert.lastInsertRowid;
  const ergebnis = await sendeFreieNachricht(user, inhalt, messageId, replyToken, profil);
  db.prepare('UPDATE messages SET poke_payload = ?, status = ?, error_message = ? WHERE id = ?')
    .run(ergebnis.payload, ergebnis.erfolg ? 'gesendet' : 'fehlgeschlagen', ergebnis.fehler || null, messageId);
  if (!ergebnis.erfolg) throw new Error(ergebnis.fehler || 'Poke konnte die Schulnachricht nicht empfangen.');
  return messageId;
}

async function aktualisiereAutomatischeSchulmodi() {
  const integrations = db.prepare(`
    SELECT si.*, pp.webhook_url, pp.api_key, pp.name AS profil_name,
           u.id AS user_id, u.username, u.email
    FROM schul_integrationen si
    JOIN poke_profiles pp ON pp.id = si.profil_id
    JOIN users u ON u.id = si.nutzer_id
    WHERE si.modus = 'auto' AND u.is_active = 1
  `).all();

  for (const integration of integrations) {
    const aktiv = istSchulmodusAktiv(integration) ? 1 : 0;
    if (integration.letzter_status === aktiv) continue;
    db.prepare('UPDATE schul_integrationen SET letzter_status = ? WHERE id = ?').run(aktiv, integration.id);
    const user = { id: integration.user_id, username: integration.username, email: integration.email };
    const profil = { webhook_url: integration.webhook_url, api_key: integration.api_key };
    const nachricht = aktiv
      ? schulMorgenbriefingAnweisung(`${getSetting('app_url') || 'http://localhost:3000'}/api/webhooks/schul-update/${integration.token}`)
      : 'Die konfigurierte Schulzeit ist beendet. Stoppe die Schul-Dashboard-Synchronisierung und sende bis zum nächsten Schulzeitbeginn keine unwichtigen Updates.';
    try {
      await sendeSchulNachricht(user, nachricht, { ...profil, id: integration.profil_id });
    } catch (e) {
      console.error('[yRelay] Automatische Schulmodus-Mitteilung fehlgeschlagen:', e.message);
    }
  }
}

function schulMorgenbriefingAnweisung(url) {
  return `Die Schulzeit hat begonnen. Aktualisiere jetzt das Schul-Dashboard und sende danach ein freundliches, ausführliches Morgenbriefing als feed-Ereignis. Begrüße mich warm und positiv, nenne zuerst die wichtigsten Dinge und fasse meinen heutigen Stundenplan, Kalender, offenen Aufgaben, Erinnerungen und relevante Nachrichten übersichtlich zusammen. Weise auch auf Änderungen, Konflikte oder baldige Termine hin. Das Briefing soll mich gut informiert und mit einem guten Gefühl in den Tag starten lassen.

Das Feld daten.inhalt des Briefings darf und soll mehrere Zeilen enthalten. Verwende gut lesbares Markdown mit kurzen Überschriften (##), Aufzählungen (-), **Fettdruck**, *Kursivschrift* und einzelnen Zeilenumbrüchen. Schreibe keine HTML-Tags. Eine sinnvolle Reihenfolge ist: Begrüßung, „Heute im Stundenplan“, „Kalender und Aufgaben“, „Wichtig für dich“ und ein kurzer freundlicher Abschluss.

Sende ausschließlich Daten für heute in der konfigurierten Zeitzone; niemals gestrige Kalendertermine oder Aufgaben. Verwende für den Stundenplan fach, lehrer, raum, start und ende. Sende vollständige aktuelle Stände an ${url}: Kalender mit {"typ":"kalender","daten":[...]}, Aufgaben mit {"typ":"aufgabe","daten":[...]}, Stundenplan mit {"typ":"stundenplan","daten":[{"wochentag":1,"fach":"Mathe","lehrer":"Frau Müller","start":"08:00","ende":"08:45","raum":"204"}]}. Eigene Kacheln verwaltest du mit {"typ":"kachel","daten":{"aktion":"upsert","schluessel":"pausen","titel":"Pausen","icon":"☕","farbe":"#f59e0b","inhalt":"## Pause\n- Entspann dich","formular":[{"name":"ort","label":"Wo bist du?","type":"text","required":true}]}}; zum Entfernen verwendest du aktion delete mit demselben schluessel. Kacheln dürfen Markdown und optionale Formularfelder (text, date, time, textarea, select) enthalten. Sende das Morgenbriefing danach als einzelne wichtige Meldung mit {"typ":"feed","daten":{"typ":"briefing","inhalt":"..."}}. Sende später bei Änderungen erneut die vollständigen heutigen Kalender-/Aufgabenstände und wichtige neue Meldungen, aber keine unwichtigen Benachrichtigungen.`;
}

function schulApiAnleitung(req, integration) {
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const url = `${appUrl}/api/webhooks/schul-update/${integration.integration.token}`;
  return `Schul-Dashboard-Integration für yRelay. Der echte Kalender bleibt dein normaler Kalender; yRelay zeigt nur eine Schulansicht davon. Callback-URL: ${url}\n\n${schulMorgenbriefingAnweisung(url)}`;
}

// GET /api/schuldashboard/daten - Lädt alle Dashboard-Daten
router.get('/daten', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  try {
    const integration = holeOderErzeugeIntegration(req);
    if (!integration) return res.status(409).json({ fehler: 'Für das Schul-Dashboard ist kein Poke-Profil verfügbar.' });
    const schulmodusAktiv = istSchulmodusAktiv(integration.integration);
    const heute = heutigesDatum();
    const kalender = db.prepare(`SELECT * FROM schul_kalender_cache
      WHERE integration_id = ? AND substr(start, 1, 10) = ? ORDER BY start ASC`).all(integration.integration.id, heute);
    const aufgaben = db.prepare(`SELECT * FROM schul_aufgaben_cache
      WHERE integration_id = ? AND erledigt = 0 AND (faellig IS NULL OR substr(faellig, 1, 10) = ?) ORDER BY faellig ASC`).all(integration.integration.id, heute);
    const stundenplan = db.prepare(`SELECT * FROM schul_stundenplan
      WHERE integration_id = ? ORDER BY wochentag ASC, start ASC`).all(integration.integration.id);
    const kacheln = db.prepare(`SELECT * FROM schul_kacheln
      WHERE integration_id = ? ORDER BY sortierung ASC, id ASC`).all(integration.integration.id).map(kachel => {
      let formular = [];
      try { formular = kachel.formular ? JSON.parse(kachel.formular) : []; } catch (e) {}
      return { ...kachel, formular };
    });
    const feed = db.prepare('SELECT * FROM schul_feed WHERE integration_id = ? ORDER BY zeitpunkt DESC LIMIT 50').all(integration.integration.id);

    res.json({
      schulmodusAktiv,
      kalender,
      aufgaben,
      stundenplan,
      kacheln,
      feed
      ,modus: integration.integration.modus
    });
  } catch (err) {
    res.status(500).json({ fehler: err.message });
  }
});

// GET /api/schuldashboard/integration - Callback-Daten für das zugewiesene Schul-Poke
router.get('/integration', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Für das Schul-Dashboard ist kein Poke-Profil verfügbar.' });
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  res.json({
    profilId: integration.profil.id,
    profilName: integration.profil.name,
    token: integration.integration.token,
    callbackUrl: `${appUrl}/api/webhooks/schul-update/${integration.integration.token}`,
  });
});

// POST /api/schuldashboard/modus - Schulmodus umschalten
router.post('/modus', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { aktiv, modus } = req.body;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Für das Schul-Dashboard ist kein Poke-Profil verfügbar.' });
  if (modus && !['auto', 'manual_on', 'manual_off'].includes(modus)) {
    return res.status(400).json({ fehler: 'Ungültiger Schulmodus.' });
  }
  const neuerModus = modus || (aktiv ? 'manual_on' : 'manual_off');
  db.prepare('UPDATE schul_integrationen SET modus = ? WHERE id = ?')
    .run(neuerModus, integration.integration.id);
  
  // Poke benachrichtigen, dass der Modus geändert wurde
  const inhalt = neuerModus === 'auto'
    ? schulMorgenbriefingAnweisung(`${getSetting('app_url') || 'http://localhost:3000'}/api/webhooks/schul-update/${integration.integration.token}`)
    : aktiv
    ? schulApiAnleitung(req, integration)
    : 'Der Schulmodus ist jetzt deaktiviert. Sende keine Schul-Dashboard-Updates mehr, bis ich ihn wieder aktiviere.';
  
  let pokeProfile = null;
  pokeProfile = integration?.profil || null;

  try {
    await sendeSchulNachricht(req.user, inhalt, pokeProfile);
  } catch(e) {
    console.error('Fehler beim Senden der Modusänderung an Poke:', e);
  }

  logAudit(req.user.id, 'schulmodus_toggle', { aktiv: neuerModus === 'manual_on', modus: neuerModus });
  res.json({ erfolg: true, aktiv: istSchulmodusAktiv(integration.integration), modus: neuerModus });
});

// POST /api/schuldashboard/aktion - Aktion ausführen (z.B. Termin eintragen)
router.post('/aktion', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { aktionTyp, daten } = req.body;
  let befehl = '';

  if (aktionTyp === 'termin') {
    befehl = `Trage folgenden Termin in meinen normalen Kalender ein:\nTitel: ${daten.titel}\nStandort: ${daten.standort || '(kein Standort)'}\nVon: ${daten.start || '(ganztägig)'}\nBis: ${daten.ende || '(kein Ende)'}\nGanztägig: ${daten.ganztaegig ? 'Ja' : 'Nein'}\nNotiz: ${daten.notiz || '(keine)'}`;
  } else if (aktionTyp === 'aufgabe') {
    befehl = `Trage folgende Aufgabe ein:\nTitel: ${daten.titel}\nFällig: ${daten.faellig}\nNotiz: ${daten.notiz}`;
  } else if (aktionTyp === 'notiz') {
    befehl = `Notiere dir folgendes:\n${daten.text}`;
  } else if (aktionTyp === 'kachel_formular') {
    const integration = holeOderErzeugeIntegration(req);
    const kachel = db.prepare('SELECT titel FROM schul_kacheln WHERE id = ? AND integration_id = ?')
      .get(daten.kachelId, integration?.integration.id);
    if (!kachel) return res.status(404).json({ fehler: 'Kachel nicht gefunden.' });
    befehl = `Das Formular der Schul-Dashboard-Kachel "${kachel.titel}" wurde ausgefüllt. Verarbeite diese Eingaben nach deiner Kachel-Anleitung:\n${JSON.stringify(daten.werte || {})}`;
  } else {
    return res.status(400).json({ fehler: 'Unbekannter Aktionstyp' });
  }

  let pokeProfile = null;
  if (req.user.schul_poke_profile_id) {
    pokeProfile = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(req.user.schul_poke_profile_id);
  }

  try {
    await sendeSchulNachricht(req.user, befehl, pokeProfile);
    logAudit(req.user.id, 'schul_aktion_gesendet', { aktionTyp });
    res.json({ erfolg: true });
  } catch(e) {
    res.status(500).json({ fehler: e.message });
  }
});

router.aktualisiereAutomatischeSchulmodi = aktualisiereAutomatischeSchulmodi;
module.exports = router;
