const express = require('express');
const { db } = require('../db');
const { sendeAntwortMail } = require('../services/email');

const router = express.Router();

// Hilfsfunktion: reply_content als Array lesen (rückwärtskompatibel)
function leseAntworten(replyContent) {
  if (!replyContent) return [];
  try {
    const parsed = JSON.parse(replyContent);
    return Array.isArray(parsed) ? parsed : [{ text: replyContent, time: null }];
  } catch {
    return [{ text: replyContent, time: null }];
  }
}

// POST /api/webhooks/poke-reply/:id/:token
router.post('/poke-reply/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ fehler: 'Feld "message" fehlt im JSON-Body.' });
  }

  // Nachricht prüfen und zugehörige Nutzer-Daten holen (inkl. user_replies)
  const msg = db.prepare(`
    SELECT m.id, m.content, m.reply_content, m.user_replies, u.email, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ? AND m.reply_token = ?
  `).get(id, token);

  if (!msg) {
    return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });
  }

  // Bestehende Poke-Antworten laden und neue anhängen
  const bestehendePokeAntworten = leseAntworten(msg.reply_content);
  const istErstantwort = bestehendePokeAntworten.length === 0;

  bestehendePokeAntworten.push({
    text: message,
    time: new Date().toISOString(),
  });

  // Als JSON speichern
  db.prepare(`
    UPDATE messages
    SET reply_content = ?, replied_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(bestehendePokeAntworten), id);

  // Nutzer-Antworten laden (für vollständigen Verlauf in der Mail)
  let nutzerAntworten = [];
  try {
    if (msg.user_replies) nutzerAntworten = JSON.parse(msg.user_replies);
  } catch {}

  // Gemischten Verlauf (chronologisch: Poke & Nutzer) für die Mail aufbauen
  const gemischterVerlauf = [
    ...bestehendePokeAntworten.map(a => ({ ...a, von: 'poke' })),
    ...nutzerAntworten.map(a => ({ ...a, von: 'nutzer', name: msg.username })),
  ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

  // E-Mail-Benachrichtigung senden (asynchron im Hintergrund)
  if (msg.email) {
    sendeAntwortMail(msg.email, msg.username, msg.content, message, !istErstantwort, gemischterVerlauf).catch(err => {
      console.error('[yRelay] Fehler beim Senden der Antwort-Mail:', err);
    });
  }

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
});

module.exports = router;
