const express = require('express');
const { db } = require('../db');
const { sendeAntwortMail, sendeRueckfrageMail } = require('../services/email');

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
  const { message, buttons } = req.body;

  if (!message) {
    return res.status(400).json({ fehler: 'Feld "message" fehlt im JSON-Body.' });
  }

  // Nachricht prüfen und zugehörige Nutzer-Daten holen (inkl. user_replies)
  const msg = db.prepare(`
    SELECT m.id, m.content, m.reply_content, m.user_replies, u.email, u.username, u.ntfy_topic
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
    buttons: Array.isArray(buttons) && buttons.length > 0 ? buttons.slice(0, 5) : null,
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
  const hasButtons = Array.isArray(buttons) && buttons.length > 0;
  
  if (msg.email) {
    if (hasButtons) {
      sendeRueckfrageMail(msg.email, msg.username, msg.content, message, buttons, msg.id, token, gemischterVerlauf).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Rückfrage-Mail:', err);
      });
    } else {
      sendeAntwortMail(msg.email, msg.username, msg.content, message, !istErstantwort, gemischterVerlauf).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Antwort-Mail:', err);
      });
    }
  }
  
  // ntfy Push-Benachrichtigung senden (parallel)
  if (msg.ntfy_topic) {
    const { sendNtfyNotification } = require('../services/ntfy');
    const appUrl = require('../db').getSetting('app_url') || 'http://localhost:3000';
    const clickUrl = `${appUrl}/#dashboard`;
    
    const title = hasButtons ? '❓ Rückfrage von Poke' : '🤖 Poke hat geantwortet';
    const tags = hasButtons ? ['question', 'robot'] : ['robot', 'envelope'];
    const priority = hasButtons ? 4 : 3;
    
    sendNtfyNotification(msg.ntfy_topic, title, message, clickUrl, priority, tags).catch(err => {
      console.error('[yRelay] Fehler beim Senden der ntfy-Push-Benachrichtigung:', err);
    });
  }

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
});

// POST /api/webhooks/poke-action/:id/:token - Poke markiert Nachricht als erledigt/pinnt sie
router.post('/poke-action/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { action, notiz } = req.body; // action: 'erledigt' | 'in_bearbeitung' | 'pin'

  if (!action) return res.status(400).json({ fehler: 'Feld "action" fehlt.' });

  const msg = db.prepare(`
    SELECT id FROM messages WHERE id = ? AND reply_token = ?
  `).get(id, token);

  if (!msg) return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });

  const erlaubteActions = ['erledigt', 'in_bearbeitung', 'offen', 'pin', 'unpin'];
  if (!erlaubteActions.includes(action)) {
    return res.status(400).json({ fehler: `Action muss eine von ${erlaubteActions.join(', ')} sein.` });
  }

  if (action === 'pin') {
    db.prepare('UPDATE messages SET is_pinned = 1 WHERE id = ?').run(id);
  } else if (action === 'unpin') {
    db.prepare('UPDATE messages SET is_pinned = 0 WHERE id = ?').run(id);
  } else {
    db.prepare('UPDATE messages SET status_label = ?, status_label_notiz = ? WHERE id = ?')
      .run(action, notiz || null, id);
  }

  console.log(`[yRelay] Poke hat Nachricht ${id} mit Action "${action}" markiert.`);
  res.json({ success: true });
});

module.exports = router;
