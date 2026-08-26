// Webhook-Routes (ungeschützt, für externe Dienste wie Poke)
const express = require('express');
const { db } = require('../db');

const router = express.Router();

// POST /api/webhooks/poke-reply/:id/:token
router.post('/poke-reply/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ fehler: 'Feld "message" fehlt im JSON-Body.' });
  }

  // Nachricht prüfen
  const msg = db.prepare('SELECT id FROM messages WHERE id = ? AND reply_token = ?').get(id, token);
  
  if (!msg) {
    return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });
  }

  // Antwort speichern
  db.prepare(`
    UPDATE messages 
    SET reply_content = ?, replied_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(message, id);

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
});

module.exports = router;
