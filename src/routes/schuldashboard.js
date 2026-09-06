const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db, getSetting, setSetting, logAudit } = require('../db');
const { sendeFreieNachricht } = require('../services/poke');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

const router = express.Router();

let sseClients = [];

function notifyClients(integrationId, eventType, data = {}) {
  sseClients = sseClients.filter(c => {
    if (c.integrationId === integrationId) {
      try {
        c.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        return true;
      } catch (e) {
        return false;
      }
    }
    return true;
  });
}

// Export for other routes like webhooks.js
router.notifyClients = notifyClients;

router.use(requireAuth);

// GET /api/schuldashboard/stream - SSE Endpunkt
router.get('/stream', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // initial ping
  res.write(`data: connected\n\n`);

  const client = { id: req.user.id, integrationId: integration.integration.id, res };
  sseClients.push(client);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.res !== res);
  });
});

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

function lokaleZeit() {
  if (istFerienHeute()) return false;
  const zeitzone = getSetting('schul_zeitzone') || 'Europe/Berlin';
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: zeitzone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const wochentag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(teile.find(t => t.type === 'weekday').value);
  const minuten = Number(teile.find(t => t.type === 'hour').value) * 60 + Number(teile.find(t => t.type === 'minute').value);
  return { wochentag: wochentag || 7, minuten };
}

function istAutomatischeSchulzeit(integrationId) {
  const zeit = lokaleZeit();
  if (!zeit) return false;
  const stunden = db.prepare(`SELECT start, ende FROM schul_stundenplan
    WHERE integration_id = ? AND wochentag = ? ORDER BY start ASC`).all(integrationId, zeit.wochentag);
  let start = getSetting('schul_startzeit') || '08:00';
  let ende = getSetting('schul_endzeit') || '15:00';
  if (stunden.length > 0) {
    start = stunden[0].start;
    ende = stunden[stunden.length - 1].ende || stunden[stunden.length - 1].start;
  } else {
    const wochentage = (getSetting('schul_wochentage') || '1,2,3,4,5').split(',').map(Number);
    if (!wochentage.includes(zeit.wochentag)) return false;
  }
  const [startStunde, startMinute] = start.split(':').map(Number);
  const [endeStunde, endeMinute] = ende.split(':').map(Number);
  const vorlauf = Number(getSetting('schul_vorlauf_minuten') || 15);
  const nachlauf = Number(getSetting('schul_nachlauf_minuten') || 15);
  return zeit.minuten >= startStunde * 60 + startMinute - vorlauf && zeit.minuten < endeStunde * 60 + endeMinute + nachlauf;
}

function istSchulmodusAktiv(integration) {
  if (integration.modus === 'manual_on') return true;
  if (integration.modus === 'manual_off') return false;
  return istAutomatischeSchulzeit(integration.id);
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

Sende ausschließlich Daten für heute in der konfigurierten Zeitzone; niemals gestrige Kalendertermine oder Aufgaben. Verwende für den Stundenplan fach, lehrer, raum, start und ende. Sende vollständige aktuelle Stände an ${url}: Kalender mit {"typ":"kalender","daten":[...]}, Aufgaben mit {"typ":"aufgabe","daten":[...]}, Stundenplan mit {"typ":"stundenplan","daten":[{"wochentag":1,"fach":"Mathe","lehrer":"Frau Müller","start":"08:00","ende":"08:45","raum":"204"}]}, Klausuren (lese diese unbedingt aus dem Kalender "Schule: Termine & Arbeiten" aus) mit {"typ":"klausuren","daten":[{"titel":"Mathe", "datum":"2026-09-15"}]}. Eigene Kacheln verwaltest du mit {"typ":"kachel","daten":{"aktion":"upsert","schluessel":"pausen","titel":"Pausen","icon":"☕","farbe":"#f59e0b","inhalt":"## Pause\n- Entspann dich","formular":[{"name":"ort","label":"Wo bist du?","type":"text","required":true}]}}; zum Entfernen verwendest du aktion delete mit demselben schluessel. Kacheln dürfen Markdown und optionale Formularfelder (text, date, time, textarea, select) enthalten. Sende das Morgenbriefing danach als einzelne wichtige Meldung mit {"typ":"feed","daten":{"typ":"briefing","inhalt":"..."}}.

WICHTIG: Das Schul-Dashboard hat einen integrierten Chat-Bereich. Wenn ich dir eine Nachricht schreibe, kommt diese direkt aus dem Dashboard-Chat und ich erwarte eine direkte Antwort im Chat. Antworte auf Chat-Nachrichten ausschließlich mit {"typ":"chat","daten":{"inhalt":"..."}}, nicht als Feed. Nutze den Feed nur für wichtige Systemmeldungen, Briefings und Statusupdates. Chat-Antworten sollen kurz, freundlich und hilfreich sein - kein langes Markdown, normaler Gesprächsstil.

Für unwichtige, aber interessante Infos, die ich später in Ruhe lesen kann (z.B. Witze, Fun Facts, Erinnerungen für später, Tipps), nutze {"typ":"ping","daten":{"inhalt":"..."}}. Das erzeugt KEINEN Alert und KEINE Push-Benachrichtigung - nur eine stille Notiz im Dashboard, die ich mir in der Pause anschauen kann.

Sende später bei Änderungen erneut die vollständigen heutigen Kalender-/Aufgabenstände und wichtige neue Meldungen, aber keine unwichtigen Benachrichtigungen.`;
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
    const klausuren = db.prepare(`SELECT * FROM schul_klausuren_cache
      WHERE integration_id = ? ORDER BY datum ASC`).all(integration.integration.id);
    const feed = db.prepare('SELECT * FROM schul_feed WHERE integration_id = ? ORDER BY zeitpunkt DESC LIMIT 50').all(integration.integration.id);
    const chat = db.prepare('SELECT * FROM schul_chat WHERE integration_id = ? ORDER BY zeitpunkt ASC').all(integration.integration.id);
    const nutzer = db.prepare('SELECT schul_wetter_ort, schul_haltestellen, schul_nahe_haltestellen FROM users WHERE id = ?').get(req.user.id);
    let haltestellen = [];
    try { haltestellen = JSON.parse(nutzer.schul_haltestellen || '[]'); } catch(e) {}

    // Wochenvorschau: Kalendereintraege der naechsten 7 Tage
    const wocheStart = heute;
    const wocheEndDatum = new Date();
    wocheEndDatum.setDate(wocheEndDatum.getDate() + 7);
    const wocheEnde = wocheEndDatum.toISOString().slice(0, 10);
    const wocheKalender = db.prepare(`SELECT * FROM schul_kalender_cache
      WHERE integration_id = ? AND substr(start, 1, 10) > ? AND substr(start, 1, 10) <= ? ORDER BY start ASC LIMIT 20`)
      .all(integration.integration.id, wocheStart, wocheEnde);

    const pings = db.prepare('SELECT * FROM schul_pings WHERE integration_id = ? ORDER BY zeitpunkt DESC LIMIT 50').all(integration.integration.id);

    res.json({
      schulmodusAktiv,
      kalender,
      wocheKalender,
      aufgaben,
      stundenplan,
      kacheln,
      klausuren,
      wetterOrt: nutzer ? nutzer.schul_wetter_ort : null,
      haltestellen,
      naheHaltestellen: nutzer ? nutzer.schul_nahe_haltestellen === 1 : false,
      feed,
      chat,
      pings,
      modus: integration.integration.modus
    });
  } catch (err) {
    res.status(500).json({ fehler: err.message });
  }
});

// GET /api/schuldashboard/wetter - Wetterdaten für den konfigurierten Ort abrufen
router.get('/wetter', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const nutzer = db.prepare('SELECT schul_wetter_ort FROM users WHERE id = ?').get(req.user.id);
  if (!nutzer || !nutzer.schul_wetter_ort) {
    return res.status(404).json({ fehler: 'Kein Wetter-Ort konfiguriert.' });
  }
  const ort = nutzer.schul_wetter_ort;
  try {
    const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ort)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'yRelay-SchulDashboard/1.0' }
    });
    if (!nominatimRes.ok) throw new Error('Fehler beim Abrufen der Koordinaten');
    const geo = await nominatimRes.json();
    if (!geo || geo.length === 0) return res.status(404).json({ fehler: 'Ort nicht gefunden.' });
    
    const lat = geo[0].lat;
    const lon = geo[0].lon;
    
    const brightskyRes = await fetch(`https://api.brightsky.dev/current_weather?lat=${lat}&lon=${lon}`);
    if (!brightskyRes.ok) throw new Error('Fehler beim Abrufen des Wetters (Brightsky API)');
    const wetterData = await brightskyRes.json();
    
    res.json({ ort: geo[0].display_name.split(',')[0], wetter: wetterData.weather });
  } catch (err) {
    res.status(500).json({ fehler: err.message });
  }
});

// POST /api/schuldashboard/wetterort - Wetter-Ort speichern
router.post('/wetterort', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { ort } = req.body;
  if (typeof ort !== 'string') return res.status(400).json({ fehler: 'Ort muss ein Text sein.' });
  db.prepare('UPDATE users SET schul_wetter_ort = ? WHERE id = ?').run(ort, req.user.id);
  res.json({ success: true });
});

// POST /api/schuldashboard/haltestelle - Haltestelle suchen und speichern
router.post('/haltestelle', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { name } = req.body;
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ fehler: 'Name muss ein Text sein.' });
  try {
    const url = `https://openservice-test.vrr.de/standard/XML_STOPFINDER_REQUEST?outputFormat=JSON&type_sf=any&name_sf=${encodeURIComponent(name.trim())}&anyObjFilter_sf=2`;
    const efaRes = await fetch(url, { headers: { 'User-Agent': 'yRelay-SchulDashboard/1.0' } });
    if (!efaRes.ok) throw new Error('Fehler beim Abrufen der Haltestellen-Suche.');
    const data = await efaRes.json();

    const punkte = data.stopFinder?.points;
    if (!punkte) return res.status(404).json({ fehler: 'Keine Haltestelle gefunden.' });

    const liste = Array.isArray(punkte.point) ? punkte.point : [punkte.point];
    const haltestelle = liste.find(p => p.type === 'stop') || liste[0];
    if (!haltestelle || !haltestelle.stateless) return res.status(404).json({ fehler: 'Keine Haltestelle gefunden.' });

    const nutzer = db.prepare('SELECT schul_haltestellen FROM users WHERE id = ?').get(req.user.id);
    let arr = [];
    try { arr = JSON.parse(nutzer.schul_haltestellen || '[]'); } catch(e) {}
    
    // Nicht doppelt hinzufügen
    if (!arr.find(h => h.id === haltestelle.stateless)) {
      arr.push({ id: haltestelle.stateless, name: haltestelle.name });
      db.prepare('UPDATE users SET schul_haltestellen = ? WHERE id = ?').run(JSON.stringify(arr), req.user.id);
    }

    res.json({ success: true, name: haltestelle.name, id: haltestelle.stateless, liste: arr });
  } catch (err) {
    res.status(500).json({ fehler: err.message });
  }
});

// DELETE /api/schuldashboard/haltestelle/:id - Haltestelle entfernen
router.delete('/haltestelle/:id', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const nutzer = db.prepare('SELECT schul_haltestellen FROM users WHERE id = ?').get(req.user.id);
  let arr = [];
  try { arr = JSON.parse(nutzer.schul_haltestellen || '[]'); } catch(e) {}
  
  arr = arr.filter(h => h.id !== req.params.id);
  db.prepare('UPDATE users SET schul_haltestellen = ? WHERE id = ?').run(JSON.stringify(arr), req.user.id);
  res.json({ success: true, liste: arr });
});

// POST /api/schuldashboard/nahe-haltestellen - Nahe Haltestellen umschalten
router.post('/nahe-haltestellen', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { aktiv } = req.body;
  db.prepare('UPDATE users SET schul_nahe_haltestellen = ? WHERE id = ?').run(aktiv ? 1 : 0, req.user.id);
  res.json({ success: true });
});

// GET /api/schuldashboard/abfahrten - Echtzeit-Abfahrten per VRR EFA (OWL/NRW)
router.get('/abfahrten', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const nutzer = db.prepare('SELECT schul_haltestellen, schul_nahe_haltestellen FROM users WHERE id = ?').get(req.user.id);
  let arr = [];
  try { arr = JSON.parse(nutzer.schul_haltestellen || '[]'); } catch(e) {}
  
  if (arr.length === 0) {
    return res.status(404).json({ fehler: 'Keine Haltestelle konfiguriert.' });
  }

  const naheAktiv = nutzer.schul_nahe_haltestellen === 1;
  const limit = naheAktiv ? 15 : 10;
  // Wenn naheAktiv, fügen wir einen Parameter hinzu (nameInfo_dm ist ein Hack, aber EFA hat oft name_dm für Makro.
  // Eigentlich ist useAllStops=1 das sicherste für Stationen mit Unterstationen.
  const useAllStops = naheAktiv ? 1 : 0; 
  
  try {
    const abfahrtenProStation = [];

    await Promise.all(arr.map(async (station) => {
      const url = `https://openservice-test.vrr.de/standard/XML_DM_REQUEST?outputFormat=JSON&type_dm=stopID&name_dm=${encodeURIComponent(station.id)}&mode=direct&useRealtime=1&limit=${limit}&useAllStops=${useAllStops}`;
      try {
        const efaRes = await fetch(url, { headers: { 'User-Agent': 'yRelay-SchulDashboard/1.0' } });
        if (!efaRes.ok) return;
        const data = await efaRes.json();
        const roheAbfahrten = data?.departureList;
        if (!roheAbfahrten) {
          abfahrtenProStation.push({ haltestelle: station.name, abfahrten: [] });
          return;
        }

        const liste = Array.isArray(roheAbfahrten) ? roheAbfahrten : [roheAbfahrten];
        const abfahrten = liste.slice(0, limit).map(dep => {
          const linie = dep.servingLine?.number || dep.servingLine?.name || '?';
          const ziel = dep.servingLine?.direction || dep.servingLine?.dest || '?';
          const dt = dep.dateTime;
          const planZeit = dt ? `${String(dt.hour).padStart(2, '0')}:${String(dt.minute).padStart(2, '0')}` : null;
          const rdt = dep.realDateTime;
          const echtZeit = rdt ? `${String(rdt.hour).padStart(2, '0')}:${String(rdt.minute).padStart(2, '0')}` : null;
          
          let verspaetung = 0;
          if (dt && rdt) {
            const planMin = parseInt(dt.hour) * 60 + parseInt(dt.minute);
            const echtMin = parseInt(rdt.hour) * 60 + parseInt(rdt.minute);
            verspaetung = echtMin - planMin;
          }
          // Bei naheAktiv ist es sinnvoll, den Namen der Unterstation mitzugeben
          const abfahrtsOrt = naheAktiv && dep.stopName ? dep.stopName : station.name;
          return { linie, ziel, planZeit, echtZeit, verspaetung, abfahrtsOrt };
        });
        abfahrtenProStation.push({ haltestelle: station.name, abfahrten });
      } catch (e) {
        // Ignorieren, Fehler bei einer Station soll nicht alle killen
      }
    }));

    res.json({ stationen: abfahrtenProStation });
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

// POST /api/schuldashboard/chat - Nutzer sendet Chat-Nachricht an Poke
router.post('/chat', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { nachricht } = req.body;
  if (typeof nachricht !== 'string' || !nachricht.trim()) {
    return res.status(400).json({ fehler: 'Nachricht darf nicht leer sein.' });
  }
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });

  // Nutzer-Nachricht in Chat-History speichern
  db.prepare('INSERT INTO schul_chat (integration_id, absender, inhalt) VALUES (?, ?, ?)')
    .run(integration.integration.id, 'nutzer', nachricht.trim());

  const befehl = `[SCHUL-DASHBOARD CHAT] ${nachricht.trim()}`;

  let pokeProfile = integration.profil;
  if (req.user.schul_poke_profile_id) {
    pokeProfile = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(req.user.schul_poke_profile_id) || pokeProfile;
  }

  try {
    await sendeSchulNachricht(req.user, befehl, pokeProfile);
    logAudit(req.user.id, 'schul_chat_nachricht', { laenge: nachricht.length });
    res.json({ erfolg: true });
  } catch(e) {
    res.status(500).json({ fehler: e.message });
  }
});

// DELETE /api/schuldashboard/chat - Chat-Verlauf löschen
router.delete('/chat', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });
  db.prepare('DELETE FROM schul_chat WHERE integration_id = ?').run(integration.integration.id);
  notifyClients(integration.integration.id, 'update');
  res.json({ erfolg: true });
});

// PATCH /api/schuldashboard/pings/:id/gelesen - Ping als gelesen markieren
router.patch('/pings/:id/gelesen', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });
  db.prepare('UPDATE schul_pings SET gelesen = 1 WHERE id = ? AND integration_id = ?')
    .run(req.params.id, integration.integration.id);
  notifyClients(integration.integration.id, 'update');
  res.json({ erfolg: true });
});

// DELETE /api/schuldashboard/pings - Alle gelesenen Pings löschen
router.delete('/pings', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });
  db.prepare('DELETE FROM schul_pings WHERE integration_id = ? AND gelesen = 1').run(integration.integration.id);
  notifyClients(integration.integration.id, 'update');
  res.json({ erfolg: true });
});
// PATCH /api/schuldashboard/aufgaben/:id/erledigt - Aufgabe abhaken/ent-abhaken
router.patch('/aufgaben/:id/erledigt', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });
  
  const { erledigt } = req.body;
  const aufgabe = db.prepare('SELECT * FROM schul_aufgaben_cache WHERE id = ? AND integration_id = ?')
    .get(req.params.id, integration.integration.id);
    
  if (!aufgabe) return res.status(404).json({ fehler: 'Aufgabe nicht gefunden.' });
  
  db.prepare('UPDATE schul_aufgaben_cache SET erledigt = ? WHERE id = ? AND integration_id = ?')
    .run(erledigt ? 1 : 0, req.params.id, integration.integration.id);
    
  // Poke benachrichtigen
  try {
    const statusText = erledigt ? 'erledigt' : 'wieder als offen markiert';
    const text = `Der Nutzer hat die Aufgabe "${aufgabe.titel}" auf dem Schul-Dashboard als ${statusText} markiert.`;
    await sendeFreieNachricht(integration.nutzer, integration.profil, text);
  } catch (e) {
    console.error('[Schul-Dashboard] Fehler beim Benachrichtigen von Poke über Aufgabe:', e.message);
  }
  
  notifyClients(integration.integration.id, 'update');
  res.json({ erfolg: true });
});
// POST /api/schuldashboard/upload - Datei via Pingvin Share hochladen
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const integration = holeOderErzeugeIntegration(req);
  if (!integration) return res.status(409).json({ fehler: 'Kein Poke-Profil verfügbar.' });

  if (!req.file) return res.status(400).json({ fehler: 'Keine Datei übergeben.' });

  const pingvinUrl = getSetting('pingvin_url');
  const pingvinUser = getSetting('pingvin_user');
  const pingvinPass = getSetting('pingvin_password');

  if (!pingvinUrl || !pingvinUser || !pingvinPass) {
    return res.status(500).json({ fehler: 'Pingvin Share ist nicht konfiguriert.' });
  }

  try {
    const baseUrl = pingvinUrl.replace(/\/+$/, '');
    
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pingvinUser, password: pingvinPass })
    });
    
    if (!loginRes.ok) throw new Error(`Pingvin Login fehlgeschlagen: ${loginRes.status}`);
    
    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('Kein Session-Cookie von Pingvin erhalten.');
    const cookie = setCookie.split(';')[0]; // pingvin-share-session=...

    // 2. Share erstellen
    const shareRes = await fetch(`${baseUrl}/api/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        name: `Upload von ${req.user.username} (Schul-Dashboard)`,
        // expiration 7 days later
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    if (!shareRes.ok) throw new Error(`Pingvin Share konnte nicht erstellt werden: ${shareRes.status}`);
    const shareData = await shareRes.json();
    const shareId = shareData.id;

    // 3. Datei hochladen
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    
    // Sometimes pingvin needs chunking, but we try a direct upload first.
    // The endpoint is usually POST /api/shares/:shareId/files
    const uploadRes = await fetch(`${baseUrl}/api/shares/${shareId}/files`, {
      method: 'POST',
      headers: { 'Cookie': cookie },
      body: formData
    });
    
    if (!uploadRes.ok) throw new Error(`Pingvin Upload fehlgeschlagen: ${uploadRes.status}`);

    const shareLink = `${baseUrl}/share/${shareId}`;

    // Optional: Nachricht direkt im Backend in den Chat legen & an Poke senden
    const nachrichtText = `[Datei] ${req.file.originalname}:\n${shareLink}`;
    db.prepare('INSERT INTO schul_chat (integration_id, absender, inhalt) VALUES (?, ?, ?)')
      .run(integration.integration.id, 'nutzer', nachrichtText);

    try {
      await sendeFreieNachricht(integration.nutzer, integration.profil, `Der Nutzer hat über das Schul-Dashboard eine Datei hochgeladen:\n${nachrichtText}`);
    } catch (e) {
      console.error('[Schul-Dashboard] Fehler beim Senden des Upload-Links an Poke:', e.message);
    }

    notifyClients(integration.integration.id, 'update');
    res.json({ erfolg: true, link: shareLink, text: nachrichtText });
  } catch (err) {
    console.error('[Pingvin Upload] Fehler:', err.message);
    res.status(500).json({ fehler: err.message });
  }
});

router.aktualisiereAutomatischeSchulmodi = aktualisiereAutomatischeSchulmodi;
module.exports = router;
