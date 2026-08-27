// yRelay - Reminder-Service
// Überwacht unbeantwortete Nachrichten und pikt Poke an bzw. benachrichtigt Nutzer
const { db, getSetting } = require('../db');
const { sendeAusstehendeAntwortMail } = require('./email');

// Poke direkt über den Webhook antriggern (ohne neue DB-Nachricht zu erstellen)
async function pokeErinnern(message) {
  const webhookUrl = getSetting('poke_webhook_url');
  const apiKey = getSetting('poke_api_key');
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
    // Nachrichten holen, die:
    // - Status 'gesendet' haben
    // - Noch KEINE Poke-Antwort haben (reply_content IS NULL)
    // - Vor mehr als 5 Minuten erstellt wurden
    const unbeantwortete = db.prepare(`
      SELECT m.id, m.content, m.reply_token, m.reminder_sent_at, m.user_notified_at,
             m.created_at, u.email, u.username
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
