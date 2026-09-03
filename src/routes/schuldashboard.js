const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db, getSetting, setSetting, logAudit } = require('../db');
const { sendeFreieNachricht } = require('../services/poke');

const router = express.Router();
router.use(requireAuth);

// GET /api/schuldashboard/daten - Lädt alle Dashboard-Daten
router.get('/daten', (req, res) => {
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

// POST /api/schuldashboard/modus - Schulmodus umschalten
router.post('/modus', async (req, res) => {
  const { aktiv } = req.body;
  setSetting('schulmodus_aktiv', aktiv ? 'true' : 'false');
  
  // Wenn deaktiviert, leere optional den Cache
  if (!aktiv) {
    db.prepare('DELETE FROM schul_kalender_cache').run();
    db.prepare('DELETE FROM schul_aufgaben_cache').run();
    db.prepare('DELETE FROM schul_feed').run();
  }

  // Poke benachrichtigen, dass der Modus geändert wurde
  const replyToken = require('crypto').randomBytes(16).toString('hex');
  const inhalt = aktiv ? 'Befehl: AKTIVIERE SCHULMODUS. Bitte sende mir ab sofort keine unwichtigen Benachrichtigungen mehr, sondern puffere sie im Schul-Feed.' : 'Befehl: DEAKTIVIERE SCHULMODUS. Du kannst mir wieder normal schreiben.';
  
  let pokeProfile = null;
  if (req.user.schul_poke_profile_id) {
    pokeProfile = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(req.user.schul_poke_profile_id);
  }

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
