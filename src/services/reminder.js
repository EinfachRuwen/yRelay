// yRelay - Reminder-Service
// Überwacht unbeantwortete Nachrichten, erinnert Agenten und benachrichtigt Nutzer
const { db, getSetting, logAudit } = require('../db');

// Agenten direkt erinnern, ohne eine neue Nachricht in der Datenbank anzulegen
async function pokeErinnern(message) {
  let webhookUrl = getSetting('poke_webhook_url');
  let apiKey = getSetting('poke_api_key');
  let agent = null;

  if (message.poke_profile_id) {
    agent = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(message.poke_profile_id) || null;
    if (agent) {
      webhookUrl = agent.webhook_url;
      apiKey = agent.api_key;
    }
  }

  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const agentName = agent?.name || 'KI-Agent';
  const replyRoute = /poke/i.test(agentName) ? 'poke-reply' : 'agent-reply';
  const schoolIntegration = message.type === 'school' && agent?.interface_mode === 'website'
    ? db.prepare('SELECT id, token FROM schul_integrationen WHERE nutzer_id = ? AND profil_id = ?').get(message.user_id, agent.id)
    : null;
  const antwortLink = agent?.interface_mode === 'website'
    ? (schoolIntegration
      ? `${appUrl}/agent/school/${schoolIntegration.id}/${schoolIntegration.token}?messageId=${message.id}&messageToken=${message.reply_token}`
      : `${appUrl}/agent/${message.id}/${message.reply_token}`)
    : `${appUrl}/api/webhooks/${replyRoute}/${message.id}/${message.reply_token}`;
  const websiteModus = agent?.interface_mode === 'website';
  const antwortAnweisung = agent?.interface_mode === 'website'
    ? (schoolIntegration
      ? `Öffne die yRelay-Schul-Webseite und trage die passenden Schul-Dashboard-Daten dort ein: ${antwortLink}. Sende keine HTTP-Anfragen selbst.`
      : `Öffne die yRelay-Antwortseite und erledige die Aufgabe dort: ${antwortLink}. Dort kannst du antworten, Buttons anbieten und Statusaktionen auswählen. Sende keine HTTP-Anfragen selbst.`)
    : `Sende deine Antwort per POST als JSON {"message":"Deine Antwort"} an: ${antwortLink}`;
  const buttonsAnweisung = websiteModus
    ? (schoolIntegration
      ? 'Schul-Dashboard-Einträge übermittelst du über die Bereiche auf der Webseite.'
      : 'Bei einer Rückfrage kannst du auf der Webseite bis zu 5 Buttons als JSON-Array hinzufügen; die Auswahl wird dir als neue System-Nachricht zugestellt.')
    : 'Bei einer Rückfrage kannst du im API-Modus ein buttons-Array mitsenden (maximal 5); der Nutzer erhält danach eine System-Nachricht mit seiner Auswahl.';
  const statusAnweisung = websiteModus
    ? (schoolIntegration ? '' : 'Statusaktionen erledigst du über die Statusauswahl auf derselben Webseite.')
    : `Statusaktionen: POST {"action":"erledigt","notiz":"Optional"} an ${appUrl}/api/webhooks/poke-action/${message.id}/${message.reply_token}. Verfügbar: erledigt, in_bearbeitung, offen, pin, unpin`;

  const erinnerungstext = `[yRelay REMINDER] 🔔 ${agentName}, du hast eine unbeantwortete Nachricht!

Eine Nachricht von ${message.username} (${message.email}) wartet seit über 5 Minuten auf deine erste Antwort.

Ursprüngliche Nachricht:
${message.content}

WICHTIG: Du MUSST auf diese Nachricht antworten. Der Absender wartet. Du kannst mehrfach antworten; jede Antwort wird gespeichert und dem Absender per E-Mail und im Dashboard angezeigt.
${antwortAnweisung}
${buttonsAnweisung}
${statusAnweisung}`;

  if (agent?.transport === 'email') {
    const { sendeAgentenAuftrag } = require('./email');
    const ergebnis = await sendeAgentenAuftrag(agent.email, agentName, `Erinnerung: Aufgabe für ${agentName}`, erinnerungstext);
    return ergebnis.erfolg;
  }
  if (!webhookUrl || !apiKey) return false;

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
    console.error('[yRelay Reminder] Agenten-Webhook Fehler:', err.message);
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
              u.email, u.username, u.id as user_id, u.ntfy_topic, u.email_notifications, u.pushover_user_key
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

        const agentName = db.prepare('SELECT name FROM poke_profiles WHERE id = ?').get(msg.poke_profile_id)?.name || 'KI-Agent';
        // 🔔 Benachrichtigung senden
        const { sendePushUndMail } = require('./notify');
        const userDaten = db.prepare('SELECT email, username, ntfy_topic, email_notifications, pushover_user_key FROM users WHERE id = ?').get(msg.user_id);
        
        if (ergebnis.erfolg) {
          sendePushUndMail(userDaten, {
            betreff: 'Geplante Nachricht versendet ⏰',
            inhalt: `Deine geplante Nachricht wurde soeben erfolgreich an ${agentName} weitergeleitet.<br><br><em>"${msg.content}"</em>`,
            icon: '⏰',
            farbe: '#10b981, #059669',
            ntfyTags: ['alarm_clock', 'white_check_mark']
          }).catch(err => console.error('[yRelay] Fehler bei Benachrichtigung (Erfolg geplant):', err));
        } else {
          sendePushUndMail(userDaten, {
            betreff: 'Fehler bei geplanter Nachricht 🚨',
            inhalt: `Deine geplante Nachricht konnte leider <strong>nicht</strong> an ${agentName} gesendet werden.<br><br><strong>Fehler:</strong> ${ergebnis.fehler}<br><em>"${msg.content}"</em>`,
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
        const userDaten = db.prepare('SELECT email, username, ntfy_topic, email_notifications, pushover_user_key FROM users WHERE id = ?').get(msg.user_id);
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
    // - Noch KEINE Agentenantwort haben (reply_content IS NULL)
    // - Vor mehr als 5 Minuten erstellt wurden
    const unbeantwortete = db.prepare(`
            SELECT m.id, m.type, m.user_id, m.content, m.reply_token, m.reminder_sent_at, m.user_notified_at,
              m.created_at, m.poke_profile_id, u.email, u.username, u.ntfy_topic, u.email_notifications, u.pushover_user_key
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

      // Schritt 1: Nach 5 Minuten - Agent erinnern (nur einmal)
      if (alter >= fuenfMinutenMs && !msg.reminder_sent_at) {
        console.log(`[yRelay Reminder] Nachricht ${msg.id} ist ${Math.floor(alter / 60000)} Min. alt - erinnere Agenten.`);

        const erfolg = await pokeErinnern(msg);

        // Immer als "gesendet" markieren, auch wenn Webhook fehlschlug
        // (verhindert Endlos-Spam bei Webhook-Ausfällen)
        db.prepare('UPDATE messages SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.id);

        if (erfolg) {
          console.log(`[yRelay Reminder] Agent wurde für Nachricht ${msg.id} erfolgreich erinnert.`);
        } else {
          console.warn(`[yRelay Reminder] Agenten-Erinnerung für Nachricht ${msg.id} fehlgeschlagen.`);
        }
      }

      // Schritt 2: Nach 10 Minuten - Nutzer per Mail informieren (nur einmal)
      if (alter >= zehnMinutenMs && !msg.user_notified_at) {
        console.log(`[yRelay Reminder] Nachricht ${msg.id} ist ${Math.floor(alter / 60000)} Min. alt - benachrichtige Nutzer per Mail.`);

        // Immer zuerst als "gesendet" markieren (Idempotenz vor dem await)
        db.prepare('UPDATE messages SET user_notified_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.id);

        const { sendePushUndMail } = require('./notify');
        sendePushUndMail(msg, {
          betreff: 'Noch keine Antwort auf deine Nachricht',
          inhalt: `Deine Nachricht wartet noch auf eine Antwort.<br><br><em>"${msg.content}"</em>`,
          icon: '⏳',
          ntfyTags: ['hourglass', 'envelope'],
          ntfyPriority: 4,
        }).catch(err => console.error('[yRelay Reminder] Benachrichtigung fehlgeschlagen:', err.message));
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
