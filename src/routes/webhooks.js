const express = require('express');
const { db, logAudit } = require('../db');
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
    SELECT m.id, m.content, m.reply_content, m.user_replies, m.poke_profile_id, u.id as user_id, u.email, u.username, u.ntfy_topic, u.email_notifications
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

  // Poke Profil Name laden
  let pokeName = 'Poke';
  if (msg.poke_profile_id) {
    const profil = db.prepare('SELECT name FROM poke_profiles WHERE id = ?').get(msg.poke_profile_id);
    if (profil) pokeName = profil.name;
  }

  // Gemischten Verlauf (chronologisch: Poke & Nutzer) für die Mail aufbauen
  const gemischterVerlauf = [
    ...bestehendePokeAntworten.map(a => ({ ...a, von: 'poke', pokeName })),
    ...nutzerAntworten.map(a => ({ ...a, von: 'nutzer', name: msg.username })),
  ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

  // E-Mail-Benachrichtigung senden (asynchron im Hintergrund)
  const hasButtons = Array.isArray(buttons) && buttons.length > 0;
  
  if (msg.email && String(msg.email_notifications) !== '0' && String(msg.email_notifications) !== 'false') {
    if (hasButtons) {
      sendeRueckfrageMail(msg.email, msg.username, msg.content, message, buttons, msg.id, token, gemischterVerlauf, pokeName).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Rückfrage-Mail:', err);
      });
    } else {
      sendeAntwortMail(msg.email, msg.username, msg.content, message, !istErstantwort, gemischterVerlauf, pokeName).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Antwort-Mail:', err);
      });
    }
  }
  
  // ntfy Push-Benachrichtigung senden (parallel)
  if (msg.ntfy_topic) {
    const { sendNtfyNotification } = require('../services/ntfy');
    const appUrl = require('../db').getSetting('app_url') || 'http://localhost:3000';
    const clickUrl = `${appUrl}/#dashboard`;
    
    const title = hasButtons ? `❓ Rückfrage von ${pokeName}` : `🤖 ${pokeName} hat geantwortet`;
    const tags = hasButtons ? ['question', 'robot'] : ['robot', 'envelope'];
    const priority = hasButtons ? 4 : 3;
    
    sendNtfyNotification(msg.ntfy_topic, title, message, clickUrl, priority, tags).catch(err => {
      console.error('[yRelay] Fehler beim Senden der ntfy-Push-Benachrichtigung:', err);
    });
  }

  logAudit(msg.user_id, 'poke_reply_received', { message_id: msg.id, has_buttons: hasButtons });

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
});

// POST /api/webhooks/poke-action/:id/:token - Poke markiert Nachricht als erledigt/pinnt sie
router.post('/poke-action/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { action, notiz } = req.body; // action: 'erledigt' | 'in_bearbeitung' | 'pin'

  if (!action) return res.status(400).json({ fehler: 'Feld "action" fehlt.' });

  const msg = db.prepare(`
    SELECT m.id, m.content, u.id as user_id, u.email, u.username, u.ntfy_topic, u.email_notifications
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ? AND m.reply_token = ?
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
      
    // Benachrichtigung senden, wenn der Status geändert wird
    const { sendePushUndMail } = require('../services/notify');
    
    let titel = '';
    let emoji = 'ℹ️';
    let farbe = '#6366f1, #8b5cf6';
    let tags = ['information_source'];
    
    if (action === 'erledigt') {
      titel = 'Aufgabe erledigt ✅';
      emoji = '✅';
      farbe = '#10b981, #059669'; // Gruen
      tags = ['white_check_mark'];
    } else if (action === 'in_bearbeitung') {
      titel = 'Aufgabe in Bearbeitung ⏳';
      emoji = '⏳';
      farbe = '#f59e0b, #d97706'; // Orange
      tags = ['hourglass'];
    } else if (action === 'offen') {
      titel = 'Aufgabe wieder offen 📝';
      emoji = '📝';
      tags = ['memo'];
    }

    const inhaltHTML = `Poke hat den Status deiner Nachricht auf <strong>${action}</strong> gesetzt.<br><br>
    <em>Deine Nachricht: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"</em>
    ${notiz ? `<br><br><strong>Notiz von Poke:</strong> ${notiz}` : ''}`;

    sendePushUndMail(msg, {
      betreff: `Poke Status-Update: ${titel}`,
      inhalt: inhaltHTML,
      icon: emoji,
      farbe: farbe,
      ntfyTags: tags
    }).catch(err => console.error('[yRelay] Fehler bei Push/Mail (Status-Update):', err));

    logAudit(msg.user_id, 'poke_status_update', { message_id: msg.id, action, notiz });
  }

  console.log(`[yRelay] Poke hat Nachricht ${id} mit Action "${action}" markiert.`);
  res.json({ success: true });
});

// POST /api/webhooks/schul-update/:token
router.post('/schul-update/:token', (req, res) => {
  const integration = db.prepare(`
    SELECT id, nutzer_id, profil_id FROM schul_integrationen WHERE token = ?
  `).get(req.params.token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Schul-Integrationstoken.' });

  const { typ, daten } = req.body;
  
  try {
    if (typ === 'kalender') {
      db.prepare('DELETE FROM schul_kalender_cache').run();
      const stmt = db.prepare('INSERT INTO schul_kalender_cache (titel, start, ende, ganztaegig, notiz) VALUES (?, ?, ?, ?, ?)');
      if (Array.isArray(daten)) {
        for (const t of daten) {
          stmt.run(t.titel, t.start, t.ende || null, t.ganztaegig ? 1 : 0, t.notiz || null);
        }
      }
    } else if (typ === 'aufgabe') {
      db.prepare('DELETE FROM schul_aufgaben_cache').run();
      const stmt = db.prepare('INSERT INTO schul_aufgaben_cache (titel, faellig, erledigt, notiz) VALUES (?, ?, ?, ?)');
      if (Array.isArray(daten)) {
        for (const a of daten) {
          stmt.run(a.titel, a.faellig || null, a.erledigt ? 1 : 0, a.notiz || null);
        }
      }
    } else if (typ === 'feed') {
      db.prepare('INSERT INTO schul_feed (typ, inhalt) VALUES (?, ?)').run(daten.typ || 'info', daten.inhalt);
    } else {
      return res.status(400).json({ fehler: 'Unbekannter Typ' });
    }
    res.json({ erfolg: true });
  } catch (err) {
    console.error('[yRelay] Fehler beim Schul-Update Webhook:', err);
    res.status(500).json({ fehler: err.message });
  }
});

module.exports = router;
