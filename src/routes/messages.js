// Nachrichten-Routes für yRelay
const express = require('express');
const { db, getSetting } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendeFreieNachricht, sendeNotfallbenachrichtigung } = require('../services/poke');

// Levenshtein-Distanz berechnen
function calculateLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

// Prüfen ob Text zu >= 50% ähnlich ist
function isMostlyOriginal(original, edited) {
  if (!original) return false;
  const distance = calculateLevenshteinDistance(original, edited);
  const maxLength = Math.max(original.length, edited.length);
  if (maxLength === 0) return false;
  
  const similarity = 1 - (distance / maxLength);
  return similarity >= 0.5;
}

const router = express.Router();

// Alle Routes erfordern Authentifizierung
router.use(requireAuth);

// POST /api/nachrichten/senden - Freie Nachricht an Poke senden
router.post('/senden', async (req, res) => {
  const { inhalt, originalTranskript } = req.body;

  if (!inhalt || !inhalt.trim()) {
    return res.status(400).json({ fehler: 'Die Nachricht darf nicht leer sein.' });
  }

  if (inhalt.length > 5000) {
    return res.status(400).json({ fehler: 'Die Nachricht darf maximal 5000 Zeichen lang sein.' });
  }

  // Token generieren und temporären Eintrag erstellen
  const replyToken = require('crypto').randomBytes(16).toString('hex');
  const insertErgebnis = db.prepare(`
    INSERT INTO messages (user_id, type, content, poke_payload, status, reply_token)
    VALUES (?, 'free', ?, '', 'wird_gesendet', ?)
  `).run(req.user.id, inhalt.trim(), replyToken);

  const messageId = insertErgebnis.lastInsertRowid;

  let pokeInhalt = inhalt.trim();
  if (isMostlyOriginal(originalTranskript, pokeInhalt)) {
    pokeInhalt += '\n\n[System-Hinweis: Diese Nachricht wurde per Spracheingabe diktiert und von einer KI transkribiert. Sie wurde zu mehr als 50% im Original belassen, weshalb sie Fehler enthalten kann. Bitte bei der Bearbeitung auf Kontext/Rechtschreibung achten.]';
  }

  // Nachricht an Poke senden
  const ergebnis = await sendeFreieNachricht(req.user, pokeInhalt, messageId, replyToken);

  // Status in Datenbank aktualisieren
  db.prepare(`
    UPDATE messages
    SET poke_payload = ?, status = ?, error_message = ?
    WHERE id = ?
  `).run(
    ergebnis.payload,
    ergebnis.erfolg ? 'gesendet' : 'fehlgeschlagen',
    ergebnis.fehler || null,
    messageId
  );

  if (!ergebnis.erfolg) {
    return res.status(502).json({
      fehler: `Nachricht konnte nicht an Poke gesendet werden: ${ergebnis.fehler}`,
    });
  }

  res.json({ nachricht: 'Nachricht erfolgreich an Poke gesendet.' });
});

// POST /api/nachrichten/notfall - Notfallbenachrichtigung senden
router.post('/notfall', async (req, res) => {
  const { inhalt, prioritaet, originalTranskript } = req.body;

  if (!inhalt || !inhalt.trim()) {
    return res.status(400).json({ fehler: 'Die Nachricht darf nicht leer sein.' });
  }

  if (!['hoch', 'notfall'].includes(prioritaet)) {
    return res.status(400).json({ fehler: 'Priorität muss "hoch" oder "notfall" sein.' });
  }

  if (inhalt.length > 2000) {
    return res.status(400).json({ fehler: 'Die Nachricht darf maximal 2000 Zeichen lang sein.' });
  }

  const replyToken = require('crypto').randomBytes(16).toString('hex');
  const insertErgebnis = db.prepare(`
    INSERT INTO messages (user_id, type, priority, content, poke_payload, status, reply_token)
    VALUES (?, 'emergency', ?, ?, '', 'wird_gesendet', ?)
  `).run(req.user.id, prioritaet, inhalt.trim(), replyToken);

  const messageId = insertErgebnis.lastInsertRowid;

  let pokeInhalt = inhalt.trim();
  if (isMostlyOriginal(originalTranskript, pokeInhalt)) {
    pokeInhalt += '\n\n[System-Hinweis: Diese Nachricht wurde per Spracheingabe diktiert und von einer KI transkribiert. Sie wurde zu mehr als 50% im Original belassen, weshalb sie Fehler enthalten kann. Bitte bei der Bearbeitung auf Kontext/Rechtschreibung achten.]';
  }

  const ergebnis = await sendeNotfallbenachrichtigung(req.user, pokeInhalt, prioritaet, messageId, replyToken);

  // Status in Datenbank aktualisieren
  db.prepare(`
    UPDATE messages
    SET poke_payload = ?, status = ?, error_message = ?
    WHERE id = ?
  `).run(
    ergebnis.payload,
    ergebnis.erfolg ? 'gesendet' : 'fehlgeschlagen',
    ergebnis.fehler || null,
    messageId
  );

  if (!ergebnis.erfolg) {
    return res.status(502).json({
      fehler: `Notfallbenachrichtigung konnte nicht gesendet werden: ${ergebnis.fehler}`,
    });
  }

  res.json({ nachricht: 'Notfallbenachrichtigung erfolgreich an Poke gesendet.' });
});

// GET /api/nachrichten/meine - Eigene gesendete Nachrichten
router.get('/meine', (req, res) => {
  const fixTZ = (d) => d ? d.replace(' ', 'T') + 'Z' : null;
  const nachrichten = db.prepare(`
    SELECT id, type, priority, content, status, error_message, reply_content, replied_at, created_at
    FROM messages
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(req.user.id);

  res.json(nachrichten.map(n => ({
    id: n.id,
    typ: n.type,
    prioritaet: n.priority,
    inhalt: n.content,
    status: n.status,
    fehler: n.error_message,
    antwortText: n.reply_content,
    antwortDatum: fixTZ(n.replied_at),
    gesendetAm: fixTZ(n.created_at),
  })));
});

module.exports = router;
