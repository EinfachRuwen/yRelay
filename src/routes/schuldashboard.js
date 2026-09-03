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

Beim Typ kalender oder aufgabe sendest du immer den vollständigen aktuellen Stand. Beim Typ feed sendest du einzelne neue wichtige Ereignisse. Sende nach Aktivierung, beim Tagesstart und bei Änderungen ein Update. Keine unwichtigen Benachrichtigungen senden.`;
}

// GET /api/schuldashboard/daten - Lädt alle Dashboard-Daten
router.get('/daten', (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  try {
    const schulmodusAktiv = getSetting('schulmodus_aktiv') === 'true';
    const kalender = db.prepare('SELECT * FROM schul_kalender_cache ORDER BY start ASC').all();
    const aufgaben = db.prepare('SELECT * FROM schul_aufgaben_cache WHERE erledigt = 0 ORDER BY faellig ASC').all();
    const feed = db.prepare('SELECT * FROM schul_feed ORDER BY zeitpunkt DESC LIMIT 50').all();

    res.json({
      schulmodusAktiv,
      kalender,
      aufgaben,
      feed
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
  const { aktiv } = req.body;
  setSetting('schulmodus_aktiv', aktiv ? 'true' : 'false');
  
  // Poke benachrichtigen, dass der Modus geändert wurde
  const replyToken = crypto.randomBytes(16).toString('hex');
  const integration = holeOderErzeugeIntegration(req);
  if (aktiv && !integration) {
    return res.status(409).json({ fehler: 'Für das Schul-Dashboard ist kein Poke-Profil verfügbar.' });
  }
  const inhalt = aktiv
    ? schulApiAnleitung(req, integration)
    : 'Der Schulmodus ist jetzt deaktiviert. Sende keine Schul-Dashboard-Updates mehr, bis ich ihn wieder aktiviere.';
  
  let pokeProfile = null;
  pokeProfile = integration?.profil || null;

  try {
    await sendeFreieNachricht(req.user, inhalt, 0, replyToken, pokeProfile);
  } catch(e) {
    console.error('Fehler beim Senden der Modusänderung an Poke:', e);
  }

  logAudit(req.user.id, 'schulmodus_toggle', { aktiv });
  res.json({ erfolg: true, aktiv });
});

// POST /api/schuldashboard/aktion - Aktion ausführen (z.B. Termin eintragen)
router.post('/aktion', async (req, res) => {
  if (!pruefeSchulZugriff(req, res)) return;
  const { aktionTyp, daten } = req.body;
  let befehl = '';

  if (aktionTyp === 'termin') {
    befehl = `Trage folgenden Termin ein:\nTitel: ${daten.titel}\nVon: ${daten.start}\nBis: ${daten.ende}\nGanztägig: ${daten.ganztaegig ? 'Ja' : 'Nein'}\nNotiz: ${daten.notiz}`;
  } else if (aktionTyp === 'aufgabe') {
    befehl = `Trage folgende Aufgabe ein:\nTitel: ${daten.titel}\nFällig: ${daten.faellig}\nNotiz: ${daten.notiz}`;
  } else if (aktionTyp === 'notiz') {
    befehl = `Notiere dir folgendes:\n${daten.text}`;
  } else {
    return res.status(400).json({ fehler: 'Unbekannter Aktionstyp' });
  }

  const replyToken = require('crypto').randomBytes(16).toString('hex');
  let pokeProfile = null;
  if (req.user.schul_poke_profile_id) {
    pokeProfile = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(req.user.schul_poke_profile_id);
  }

  try {
    await sendeFreieNachricht(req.user, befehl, 0, replyToken, pokeProfile);
    logAudit(req.user.id, 'schul_aktion_gesendet', { aktionTyp });
    res.json({ erfolg: true });
  } catch(e) {
    res.status(500).json({ fehler: e.message });
  }
});

module.exports = router;
