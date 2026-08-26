// Nachrichten-Routes für yRelay
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendeFreieNachricht, sendeNotfallbenachrichtigung } = require('../services/poke');

const router = express.Router();

// Alle Routes erfordern Authentifizierung
router.use(requireAuth);

// POST /api/nachrichten/senden - Freie Nachricht an Poke senden
router.post('/senden', async (req, res) => {
  const { inhalt } = req.body;

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

  // Nachricht an Poke senden
  const ergebnis = await sendeFreieNachricht(req.user, inhalt.trim(), messageId, replyToken);

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
  const { inhalt, prioritaet } = req.body;

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

  const ergebnis = await sendeNotfallbenachrichtigung(req.user, inhalt.trim(), prioritaet, messageId, replyToken);

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
    antwortDatum: n.replied_at,
    gesendetAm: n.created_at,
  })));
});

module.exports = router;
