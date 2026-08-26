const express = require('express');
const { db } = require('../db');
const { sendeAntwortMail } = require('../services/email');

const router = express.Router();

// POST /api/webhooks/poke-reply/:id/:token
router.post('/poke-reply/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ fehler: 'Feld "message" fehlt im JSON-Body.' });
  }

  // Nachricht prüfen und zugehörige Nutzer-Daten holen
  const msg = db.prepare(`
    SELECT m.id, m.content, u.email, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ? AND m.reply_token = ?
  `).get(id, token);
  
  if (!msg) {
    return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });
  }

  // Antwort speichern
  db.prepare(`
    UPDATE messages 
    SET reply_content = ?, replied_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(message, id);

  // E-Mail-Benachrichtigung senden (asynchron im Hintergrund)
  if (msg.email) {
    sendeAntwortMail(msg.email, msg.username, msg.content, message).catch(err => {
      console.error('[yRelay] Fehler beim Senden der Antwort-Mail:', err);
    });
  }

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
});

module.exports = router;
