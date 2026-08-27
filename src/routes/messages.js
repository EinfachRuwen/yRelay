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
      fehler: 'Poke konnte die Nachricht nicht empfangen. Bitte versuche es später erneut oder kontaktiere den Administrator.',
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
      fehler: 'Poke konnte die Notfallbenachrichtigung nicht empfangen. Bitte versuche es später erneut oder kontaktiere den Administrator.',
    });
  }

  res.json({ nachricht: 'Notfallbenachrichtigung erfolgreich an Poke gesendet.' });
});

// GET /api/nachrichten/meine - Eigene gesendete Nachrichten
router.get('/meine', (req, res) => {
  const fixTZ = (d) => d ? d.replace(' ', 'T') + 'Z' : null;
  const nachrichten = db.prepare(`
    SELECT id, type, priority, content, status, error_message, reply_content, replied_at, user_replies, created_at
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
    nutzerAntworten: n.user_replies || null,
    gesendetAm: fixTZ(n.created_at),
  })));
});

// POST /api/nachrichten/:id/antworten - Nutzer antwortet auf Pokes Antwort
router.post('/:id/antworten', async (req, res) => {
  const { id } = req.params;
  const { inhalt } = req.body;

  if (!inhalt || !inhalt.trim()) {
    return res.status(400).json({ fehler: 'Die Antwort darf nicht leer sein.' });
  }
  if (inhalt.length > 2000) {
    return res.status(400).json({ fehler: 'Die Antwort darf maximal 2000 Zeichen lang sein.' });
  }

  const nachricht = db.prepare(`
    SELECT id, content, reply_content, user_replies, reply_token
    FROM messages
    WHERE id = ? AND user_id = ?
  `).get(id, req.user.id);

  if (!nachricht) {
    return res.status(404).json({ fehler: 'Nachricht nicht gefunden.' });
  }
  if (!nachricht.reply_content) {
    return res.status(400).json({ fehler: 'Poke hat noch nicht geantwortet. Du kannst erst antworten wenn Poke geantwortet hat.' });
  }

  // Bisherige Poke-Antworten lesen (rückwärtskompatibel)
  let pokeAntworten = [];
  try {
    const parsed = JSON.parse(nachricht.reply_content);
    pokeAntworten = Array.isArray(parsed) ? parsed : [{ text: nachricht.reply_content, time: null }];
  } catch {
    pokeAntworten = [{ text: nachricht.reply_content, time: null }];
  }

  // Bisherige Nutzer-Antworten lesen
  let nutzerAntworten = [];
  try {
    if (nachricht.user_replies) {
      nutzerAntworten = JSON.parse(nachricht.user_replies);
    }
  } catch {}

  // Neue Nutzer-Antwort anhängen
  const neueAntwort = { text: inhalt.trim(), time: new Date().toISOString() };
  nutzerAntworten.push(neueAntwort);
  db.prepare('UPDATE messages SET user_replies = ? WHERE id = ?').run(JSON.stringify(nutzerAntworten), id);

  // Vollständigen Verlauf an Poke senden
  const verlaufText = [
    `URSPRÜNGLICHE NACHRICHT:
${nachricht.content}`,
    ...pokeAntworten.map((a, i) => `POKES ANTWORT ${pokeAntworten.length > 1 ? (i + 1) + ' ' : ''}(${a.time ? new Date(a.time).toLocaleString('de-DE') : 'unbekannt'}):
${a.text}`),
    ...nutzerAntworten.slice(0, -1).map((a, i) => `ANTWORT VON ${req.user.username} (${a.time ? new Date(a.time).toLocaleString('de-DE') : 'unbekannt'}):
${a.text}`),
    `NEUE ANTWORT VON ${req.user.username}:
${inhalt.trim()}`,
  ].join('\n\n---\n\n');

  const appUrl = require('../db').getSetting('app_url') || 'http://localhost:3000';
  const antwortLink = `${appUrl}/api/webhooks/poke-reply/${nachricht.id}/${nachricht.reply_token}`;

  const pokeNachricht = `[yRelay] ${req.user.username} hat auf deine Antwort geantwortet:

${verlaufText}

---
Du kannst weiterhin antworten (auch mehrfach):
${antwortLink}`;

  const { sendeFreieNachricht } = require('../services/poke');
  // Direkt über den Poke-Webhook senden (Hilfsfunktion missbrauchen mit custom payload)
  const webhookUrl = require('../db').getSetting('poke_webhook_url');
  const apiKey = require('../db').getSetting('poke_api_key');

  if (webhookUrl && apiKey) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: pokeNachricht }),
      });
    } catch (err) {
      console.error('[yRelay] Fehler beim Senden der Nutzer-Antwort an Poke:', err.message);
      // Kein Fehler zurückgeben - Antwort wurde bereits gespeichert
    }
  }

  res.json({ nachricht: 'Antwort erfolgreich gesendet.' });
});

module.exports = router;
