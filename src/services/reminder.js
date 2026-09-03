// yRelay - Reminder-Service
// Überwacht unbeantwortete Nachrichten und pikt Poke an bzw. benachrichtigt Nutzer
const { db, getSetting, logAudit } = require('../db');
const { sendeAusstehendeAntwortMail } = require('./email');

// Poke direkt über den Webhook antriggern (ohne neue DB-Nachricht zu erstellen)
async function pokeErinnern(message) {
  let webhookUrl = getSetting('poke_webhook_url');
  let apiKey = getSetting('poke_api_key');

  if (message.poke_profile_id) {
    const profil = db.prepare('SELECT webhook_url, api_key FROM poke_profiles WHERE id = ?').get(message.poke_profile_id);
    if (profil) {
      webhookUrl = profil.webhook_url;
      apiKey = profil.api_key;
    }
  }

  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  if (!webhookUrl || !apiKey) return false;

  const antwortLink = `${appUrl}/api/webhooks/poke-reply/${message.id}/${message.reply_token}`;

  const erinnerungstext = `[yRelay REMINDER] 🔔 Poke, du hast eine unbeantwortete Nachricht!

Eine Nachricht von ${message.username} (${message.email}) wartet seit über 5 Minuten auf deine erste Antwort.

Ursprüngliche Nachricht:
${message.content}

BITTE ANTWORTE SOFORT. Der Absender wartet. Sende POST {"message": "Deine Antwort"} an:
${antwortLink}`;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: erinnerungstext }),
    });
    return res.ok;
  } catch (err) {
    console.error('[yRelay Reminder] Poke-Webhook Fehler:', err.message);
    return false;
  }
}

// Hauptprüfung: alle 60 Sekunden laufen
async function pruefe() {
  const jetzt = Date.now();
  const fuenfMinutenMs = 5 * 60 * 1000;
  const zehnMinutenMs = 10 * 60 * 1000;

  try {
    // ─── Geplante Nachrichten versenden ──────────────────────────────────────
    const zuSenden = db.prepare(`
      SELECT m.id, m.content, m.type, m.priority, m.reply_token, m.poke_profile_id,
             u.email, u.username, u.id as user_id, u.ntfy_topic, u.email_notifications
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'geplant'
        AND m.send_at <= datetime('now')
    `).all();

    for (const msg of zuSenden) {
      console.log(`[yRelay Reminder] Sende geplante Nachricht ${msg.id} für ${msg.username}`);
      try {
        const { sendeFreieNachricht, sendeNotfallbenachrichtigung } = require('./poke');
        const nutzer = { username: msg.username, email: msg.email };
        
        let pokeProfil = null;
        if (msg.poke_profile_id) {
          pokeProfil = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(msg.poke_profile_id);
        }

        let ergebnis;
        if (msg.type === 'emergency') {
          ergebnis = await sendeNotfallbenachrichtigung(nutzer, msg.content, msg.priority || 'hoch', msg.id, msg.reply_token, pokeProfil);
        } else {
          ergebnis = await sendeFreieNachricht(nutzer, msg.content, msg.id, msg.reply_token, pokeProfil);
        }
        db.prepare(`
          UPDATE messages
          SET poke_payload = ?, status = ?, error_message = ?
          WHERE id = ?
        `).run(ergebnis.payload, ergebnis.erfolg ? 'gesendet' : 'fehlgeschlagen', ergebnis.fehler || null, msg.id);
        console.log(`[yRelay Reminder] Geplante Nachricht ${msg.id}: ${ergebnis.erfolg ? 'gesendet' : 'fehlgeschlagen'}`);

        logAudit(msg.user_id, 'scheduled_message_processed', { message_id: msg.id, success: ergebnis.erfolg });

        // 🔔 Benachrichtigung senden
        const { sendePushUndMail } = require('./notify');
        const userDaten = db.prepare('SELECT email, username, ntfy_topic, email_notifications FROM users WHERE id = ?').get(msg.user_id);
        
        if (ergebnis.erfolg) {
          sendePushUndMail(userDaten, {
            betreff: 'Geplante Nachricht versendet ⏰',
            inhalt: `Deine geplante Nachricht wurde soeben erfolgreich an Poke weitergeleitet.<br><br><em>"${msg.content}"</em>`,
            icon: '⏰',
            farbe: '#10b981, #059669',
            ntfyTags: ['alarm_clock', 'white_check_mark']
          }).catch(err => console.error('[yRelay] Fehler bei Benachrichtigung (Erfolg geplant):', err));
        } else {
          sendePushUndMail(userDaten, {
            betreff: 'Fehler bei geplanter Nachricht 🚨',
            inhalt: `Deine geplante Nachricht konnte leider <strong>nicht</strong> an Poke gesendet werden.<br><br><strong>Fehler:</strong> ${ergebnis.fehler}<br><em>"${msg.content}"</em>`,
            icon: '🚨',
            farbe: '#ef4444, #b91c1c',
            ntfyTags: ['warning', 'x'],
            ntfyPriority: 4
          }).catch(err => console.error('[yRelay] Fehler bei Benachrichtigung (Fehler geplant):', err));
        }

      } catch (err) {
        db.prepare("UPDATE messages SET status = 'fehlgeschlagen', error_message = ? WHERE id = ?").run(err.message, msg.id);
        console.error(`[yRelay Reminder] Fehler bei gepl. Nachricht ${msg.id}:`, err.message);

        // 🔔 Benachrichtigung senden (Catch-Block)
        const { sendePushUndMail } = require('./notify');
        const userDaten = db.prepare('SELECT email, username, ntfy_topic, email_notifications FROM users WHERE id = ?').get(msg.user_id);
        sendePushUndMail(userDaten, {
          betreff: 'Fehler bei geplanter Nachricht 🚨',
          inhalt: `Deine geplante Nachricht konnte aufgrund eines internen Fehlers <strong>nicht</strong> gesendet werden.<br><br><strong>Fehler:</strong> ${err.message}`,
          icon: '🚨',
          farbe: '#ef4444, #b91c1c',
          ntfyTags: ['warning', 'boom'],
          ntfyPriority: 4
        }).catch(err => console.error('[yRelay] Fehler bei Benachrichtigung (Catch geplant):', err));
      }
    }
    // Nachrichten holen, die:
    // - Status 'gesendet' haben
    // - Noch KEINE Poke-Antwort haben (reply_content IS NULL)
    // - Vor mehr als 5 Minuten erstellt wurden
    const unbeantwortete = db.prepare(`
      SELECT m.id, m.content, m.reply_token, m.reminder_sent_at, m.user_notified_at,
             m.created_at, m.poke_profile_id, u.email, u.username, u.ntfy_topic, u.email_notifications
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'gesendet'
        AND m.reply_content IS NULL
        AND m.created_at <= datetime('now', '-5 minutes')
    `).all();

    for (const msg of unbeantwortete) {
      const erstelltMs = new Date(msg.created_at.replace(' ', 'T') + 'Z').getTime();
      const alter = jetzt - erstelltMs;

      // Sicherheitscheck: Noch mal sicherstellen, dass keine Antwort eingegangen ist
      // (Race condition: zwischen SELECT und jetzt könnte eine reingekommen sein)
      const aktuell = db.prepare('SELECT reply_content FROM messages WHERE id = ?').get(msg.id);
      if (aktuell?.reply_content) {
        console.log(`[yRelay Reminder] Nachricht ${msg.id} hat inzwischen eine Antwort - überspringe.`);
        continue;
      }

      // Schritt 1: Nach 5 Minuten - Poke erinnern (nur einmal)
      if (alter >= fuenfMinutenMs && !msg.reminder_sent_at) {
        console.log(`[yRelay Reminder] Nachricht ${msg.id} ist ${Math.floor(alter / 60000)} Min. alt - erinnere Poke.`);

        const erfolg = await pokeErinnern(msg);

        // Immer als "gesendet" markieren, auch wenn Webhook fehlschlug
        // (verhindert Endlos-Spam bei Webhook-Ausfällen)
        db.prepare('UPDATE messages SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.id);

        if (erfolg) {
          console.log(`[yRelay Reminder] Poke wurde für Nachricht ${msg.id} erfolgreich erinnert.`);
        } else {
          console.warn(`[yRelay Reminder] Poke-Erinnerung für Nachricht ${msg.id} fehlgeschlagen (Webhook-Fehler).`);
        }
      }

      // Schritt 2: Nach 10 Minuten - Nutzer per Mail informieren (nur einmal)
      if (alter >= zehnMinutenMs && !msg.user_notified_at) {
        console.log(`[yRelay Reminder] Nachricht ${msg.id} ist ${Math.floor(alter / 60000)} Min. alt - benachrichtige Nutzer per Mail.`);

        // Immer zuerst als "gesendet" markieren (Idempotenz vor dem await)
        db.prepare('UPDATE messages SET user_notified_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.id);

        if (msg.email && String(msg.email_notifications) !== '0' && String(msg.email_notifications) !== 'false') {
          sendeAusstehendeAntwortMail(msg.email, msg.username, msg.content).then(ergebnis => {
            if (ergebnis.erfolg) {
              console.log(`[yRelay Reminder] Nutzer ${msg.username} wurde für Nachricht ${msg.id} benachrichtigt.`);
            } else {
              console.warn(`[yRelay Reminder] Mail-Fehler für Nachricht ${msg.id}: ${ergebnis.fehler}`);
            }
          }).catch(err => {
            console.error('[yRelay Reminder] Kritischer Mail-Fehler:', err.message);
          });
        }
      }
    }
  } catch (err) {
    console.error('[yRelay Reminder] Fehler beim Prüfen:', err.message);
  }
}

// Initialisierung: Prüfung alle 60 Sekunden starten
function starteReminderService() {
  console.log('[yRelay Reminder] Service gestartet (Prüfintervall: 60 Sekunden).');

  // Sofort beim Start einmal prüfen (nützlich nach Server-Neustart)
  setTimeout(() => pruefe().catch(err => console.error('[yRelay Reminder] Startprüfung fehlgeschlagen:', err)), 5000);

  // Danach alle 60 Sekunden
  setInterval(() => pruefe().catch(err => console.error('[yRelay Reminder] Prüfung fehlgeschlagen:', err)), 60 * 1000);
}

module.exports = { starteReminderService };
