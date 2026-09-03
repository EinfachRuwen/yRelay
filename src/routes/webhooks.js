const express = require('express');
const { db, logAudit } = require('../db');
const { sendeAntwortMail, sendeRueckfrageMail } = require('../services/email');

const router = express.Router();

function normalisiereStundenplan(daten) {
  const eintraege = Array.isArray(daten) ? daten : daten?.eintraege || daten?.stunden || daten?.stundenplan;
  if (!Array.isArray(eintraege)) return null;
  const wochentage = {
    sonntag: 7, sunday: 7, montag: 1, monday: 1, dienstag: 2, tuesday: 2,
    mittwoch: 3, wednesday: 3, donnerstag: 4, thursday: 4, freitag: 5,
    friday: 5, samstag: 6, saturday: 6, sonntag: 7
  };
  return eintraege.map(stunde => {
    const tag = typeof stunde.wochentag === 'string'
      ? wochentage[stunde.wochentag.trim().toLowerCase()] || Number(stunde.wochentag)
      : stunde.wochentag;
    return {
      wochentag: Number(tag),
      fach: stunde.fach || stunde.fachname || stunde.subject,
      lehrer: stunde.lehrer || stunde.lehrername || stunde.teacher || null,
      start: stunde.start || stunde.startzeit || stunde.von,
      ende: stunde.ende || stunde.endzeit || stunde.bis || null,
      raum: stunde.raum || stunde.raumname || stunde.room || null,
      notiz: stunde.notiz || stunde.hinweis || null,
    };
  });
}

function normalisiereSchulPayload(body) {
  let payload = body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { return null; }
  }
  if (!payload || typeof payload !== 'object') return null;
  if (payload.body && typeof payload.body === 'object') payload = payload.body;
  if (payload.payload && typeof payload.payload === 'object') payload = payload.payload;
  const typen = {
    timetable: 'stundenplan', schedule: 'stundenplan', calendar: 'kalender',
    events: 'kalender', task: 'aufgabe', tasks: 'aufgabe', notification: 'feed',
    message: 'feed', tile: 'kachel', card: 'kachel'
  };
  const typ = typen[String(payload.typ || payload.type || '').toLowerCase()] || payload.typ || payload.type;
  const daten = payload.daten !== undefined ? payload.daten : (payload.data !== undefined ? payload.data : payload.entries);
  return { typ, daten };
}

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
    SELECT m.id, m.type, m.content, m.reply_content, m.user_replies, m.poke_profile_id, u.id as user_id, u.email, u.username, u.ntfy_topic, u.email_notifications
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

  if (msg.type === 'school') {
    const integration = db.prepare(`
      SELECT id FROM schul_integrationen WHERE nutzer_id = ? AND profil_id = ?
    `).get(msg.user_id, msg.poke_profile_id);
    if (integration) {
      db.prepare('INSERT INTO schul_feed (integration_id, typ, inhalt) VALUES (?, ?, ?)')
        .run(integration.id, Array.isArray(buttons) && buttons.length > 0 ? 'aktion' : 'info', message);
    }
  }

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

  const schulPayload = normalisiereSchulPayload(req.body);
  if (!schulPayload || !schulPayload.typ) {
    return res.status(400).json({ fehler: 'Schul-Webhook erwartet typ/type und daten/data als JSON.' });
  }
  const { typ, daten } = schulPayload;
  
  try {
    const update = db.transaction(() => {
    if (typ === 'kalender') {
      if (!Array.isArray(daten)) return res.status(400).json({ fehler: 'Kalenderdaten müssen ein Array sein.' });
      for (const t of daten) {
        if (!t.titel || !t.start) return res.status(400).json({ fehler: 'Kalendereintrag benötigt titel und start.' });
      }
      db.prepare('DELETE FROM schul_kalender_cache WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare('INSERT INTO schul_kalender_cache (integration_id, titel, start, ende, ganztaegig, notiz) VALUES (?, ?, ?, ?, ?, ?)');
      for (const t of daten) {
        stmt.run(integration.id, t.titel, t.start, t.ende || null, t.ganztaegig ? 1 : 0, t.notiz || null);
      }
    } else if (typ === 'aufgabe') {
      if (!Array.isArray(daten)) return res.status(400).json({ fehler: 'Aufgabendaten müssen ein Array sein.' });
      for (const a of daten) {
        if (!a.titel) return res.status(400).json({ fehler: 'Aufgabe benötigt einen titel.' });
      }
      db.prepare('DELETE FROM schul_aufgaben_cache WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare('INSERT INTO schul_aufgaben_cache (integration_id, titel, faellig, erledigt, notiz) VALUES (?, ?, ?, ?, ?)');
      for (const a of daten) {
        stmt.run(integration.id, a.titel, a.faellig || null, a.erledigt ? 1 : 0, a.notiz || null);
      }
    } else if (typ === 'feed') {
      if (!daten || !daten.inhalt) return res.status(400).json({ fehler: 'Feeddaten benötigen inhalt.' });
      db.prepare('INSERT INTO schul_feed (integration_id, typ, inhalt) VALUES (?, ?, ?)')
        .run(integration.id, daten.typ || 'info', daten.inhalt);
    } else if (typ === 'stundenplan') {
      const stunden = normalisiereStundenplan(daten);
      if (!stunden) return res.status(400).json({ fehler: 'Stundenplandaten müssen ein Array oder ein Objekt mit eintraege/stunden/stundenplan sein.' });
      for (const stunde of stunden) {
        if (!Number.isInteger(stunde.wochentag) || stunde.wochentag < 1 || stunde.wochentag > 7 || !stunde.fach || !/^\d{1,2}:\d{2}$/.test(stunde.start) || (stunde.ende && !/^\d{1,2}:\d{2}$/.test(stunde.ende))) {
          return res.status(400).json({ fehler: 'Stundenplaneintrag benötigt wochentag (1-7), fach und start (HH:MM).' });
        }
      }
      db.prepare('DELETE FROM schul_stundenplan WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare(`INSERT INTO schul_stundenplan
        (integration_id, wochentag, fach, lehrer, start, ende, raum, notiz) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const stunde of stunden) {
        stmt.run(integration.id, stunde.wochentag, stunde.fach, stunde.lehrer || null, stunde.start, stunde.ende || null, stunde.raum || null, stunde.notiz || null);
      }
    } else if (typ === 'kachel') {
      if (!daten || typeof daten !== 'object' || !daten.schluessel || !daten.aktion) {
        return res.status(400).json({ fehler: 'Kachel benötigt aktion und schluessel.' });
      }
      if (daten.aktion === 'delete') {
        db.prepare('DELETE FROM schul_kacheln WHERE integration_id = ? AND schluessel = ?').run(integration.id, daten.schluessel);
      } else if (daten.aktion === 'upsert') {
        if (!daten.titel || !daten.inhalt) return res.status(400).json({ fehler: 'Kachel benötigt titel und inhalt.' });
        const formular = Array.isArray(daten.formular) ? daten.formular.slice(0, 12) : [];
        const erlaubteTypen = ['text', 'date', 'time', 'textarea', 'select'];
        if ((daten.farbe && !/^#[0-9a-f]{6}$/i.test(daten.farbe)) || formular.some(f => typeof f.name !== 'string' || typeof f.label !== 'string' || !f.name || !f.label || !erlaubteTypen.includes(f.type) || (f.type === 'select' && (!Array.isArray(f.options) || f.options.some(option => typeof option !== 'string'))))) {
          return res.status(400).json({ fehler: 'Ungültige Kachel-Formularfelder.' });
        }
        db.prepare(`INSERT INTO schul_kacheln
          (integration_id, schluessel, titel, icon, farbe, inhalt, formular, sortierung, aktualisiert_am)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(integration_id, schluessel) DO UPDATE SET titel=excluded.titel, icon=excluded.icon,
          farbe=excluded.farbe, inhalt=excluded.inhalt, formular=excluded.formular,
          sortierung=excluded.sortierung, aktualisiert_am=CURRENT_TIMESTAMP`).run(
          integration.id, daten.schluessel, daten.titel, daten.icon || '🧩', daten.farbe || '#6366f1',
          daten.inhalt, JSON.stringify(formular), Number.isInteger(daten.sortierung) ? daten.sortierung : 0
        );
      } else {
        return res.status(400).json({ fehler: 'Kachel-Aktion muss upsert oder delete sein.' });
      }
    } else {
      return res.status(400).json({ fehler: 'Unbekannter Typ' });
    }
    });
    update();
    db.prepare('UPDATE schul_integrationen SET zuletzt_aktualisiert = CURRENT_TIMESTAMP WHERE id = ?').run(integration.id);
    res.json({ erfolg: true });
  } catch (err) {
    console.error('[yRelay] Fehler beim Schul-Update Webhook:', err);
    res.status(500).json({ fehler: err.message });
  }
});

module.exports = router;
router.normalisiereStundenplan = normalisiereStundenplan;
router.normalisiereSchulPayload = normalisiereSchulPayload;
