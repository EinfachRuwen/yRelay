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
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: getSetting('schul_zeitzone') || 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const heute = `${teile.find(t => t.type === 'year').value}-${teile.find(t => t.type === 'month').value}-${teile.find(t => t.type === 'day').value}`;
  return ferien.some(zeitraum => zeitraum.von <= heute && heute <= zeitraum.bis);
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
      ? 'Die konfigurierte Schulzeit hat begonnen. Aktiviere jetzt die Schul-Dashboard-Synchronisierung und sende den aktuellen Kalender-, Aufgaben- und Benachrichtigungsstand.'
      : 'Die konfigurierte Schulzeit ist beendet. Stoppe die Schul-Dashboard-Synchronisierung und sende bis zum nächsten Schulzeitbeginn keine unwichtigen Updates.';
    try {
      await sendeSchulNachricht(user, nachricht, { ...profil, id: integration.profil_id });
    } catch (e) {
      console.error('[yRelay] Automatische Schulmodus-Mitteilung fehlgeschlagen:', e.message);
    }
  }
}

function schulApiAnleitung(req, integration) {
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const url = `${appUrl}/api/webhooks/schul-update/${integration.integration.token}`;
  return `Schul-Dashboard-Integration für yRelay:

Der Schulmodus ist jetzt aktiv. Du bist dafür verantwortlich, regelmässig aktuelle Kalender-, Aufgaben- und wichtige Benachrichtigungsdaten an yRelay zu senden. Der echte Kalender bleibt dein normaler Kalender; yRelay zeigt nur eine Schulansicht davon.

Callback-URL: ${url}
Sende JSON mit Content-Type application/json. Beispiele:
Kalender: POST ${url} mit {"typ":"kalender","daten":[{"titel":"Mathe","start":"2026-09-03T08:00:00+02:00","ende":"2026-09-03T09:00:00+02:00","ganztaegig":false,"notiz":"Raum 204"}]}
Aufgaben: POST ${url} mit {"typ":"aufgabe","daten":[{"titel":"Hausaufgabe","faellig":"2026-09-03T18:00:00+02:00","erledigt":false,"notiz":""}]}
Benachrichtigung: POST ${url} mit {"typ":"feed","daten":{"typ":"email","inhalt":"Wichtige Nachricht ..."}}
Stundenplan: POST ${url} mit {"typ":"stundenplan","daten":[{"wochentag":1,"fach":"Mathe","lehrer":"Frau Müller","start":"08:00","ende":"08:45","raum":"204","notiz":""}]}

Beim Typ kalender und aufgabe sendest du ausschließlich Einträge für den aktuellen Tag in der konfigurierten Zeitzone, niemals gestrige Einträge. Beim Typ stundenplan sendest du den vollständigen Stundenplan; yRelay zeigt daraus nur den heutigen Wochentag. Beim Typ feed sendest du einzelne neue wichtige Ereignisse. Sende nach Aktivierung, beim Tagesstart und bei Änderungen ein Update. Keine unwichtigen Benachrichtigungen senden.`;
}

// GET /api/schuldashboard/daten - Lädt alle Dashboard-Daten
router.get('/daten', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  try {
    const integration = holeOderErzeugeIntegration(req);
    if (!integration) return res.status(409).json({ fehler: 'Für das Schul-Dashboard ist kein Poke-Profil verfügbar.' });
    const schulmodusAktiv = istSchulmodusAktiv(integration.integration);
    const kalender = db.prepare(`SELECT * FROM schul_kalender_cache
      WHERE integration_id = ? AND date(start) = date('now', 'localtime') ORDER BY start ASC`).all(integration.integration.id);
    const aufgaben = db.prepare(`SELECT * FROM schul_aufgaben_cache
      WHERE integration_id = ? AND erledigt = 0 AND (faellig IS NULL OR date(faellig) = date('now', 'localtime')) ORDER BY faellig ASC`).all(integration.integration.id);
    const stundenplan = db.prepare(`SELECT * FROM schul_stundenplan
      WHERE integration_id = ? ORDER BY wochentag ASC, start ASC`).all(integration.integration.id);
    const feed = db.prepare('SELECT * FROM schul_feed WHERE integration_id = ? ORDER BY zeitpunkt DESC LIMIT 50').all(integration.integration.id);

    res.json({
      schulmodusAktiv,
      kalender,
      aufgaben,
      stundenplan,
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
    ? 'Der Schulmodus läuft jetzt automatisch nach dem konfigurierten Schulzeitplan. Synchronisiere während der berechneten Schulzeit Kalender, Aufgaben und wichtige Benachrichtigungen über die Schul-Dashboard-Integration.'
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
