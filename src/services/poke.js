// Poke-Webhook-Service für yRelay
// Sendet Nachrichten an den Poke KI-Assistenten
const { getSetting } = require('../db');

/**
 * Sendet eine freie Nachricht an Poke über den konfigurierten Webhook.
 * @param {Object} user - Der sendende Nutzer { username, email }
 * @param {string} inhalt - Der Nachrichtentext
 * @param {number|string} messageId - ID der erstellten Nachricht
 * @param {string} replyToken - Sicherheitstoken für die Antwort
 * @returns {Object} { erfolg: boolean, payload: string, fehler?: string }
 */
async function sendeFreieNachricht(user, inhalt, messageId, replyToken) {
  const webhookUrl = getSetting('poke_webhook_url');
  const apiKey = getSetting('poke_api_key');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  if (!webhookUrl || !apiKey) {
    return { erfolg: false, payload: '', fehler: 'Poke-Webhook ist nicht konfiguriert.' };
  }

  const antwortLink = `${appUrl}/api/webhooks/poke-reply/${messageId}/${replyToken}`;
  const actionLink = `${appUrl}/api/webhooks/poke-action/${messageId}/${replyToken}`;

  const nachrichtentext = `[yRelay] Externe Nachricht von ${user.username} (${user.email}):

${inhalt}

---
Dies ist eine externe Nachricht, die über yRelay weitergeleitet wurde. Bitte informiere Ruwen über den Eingang dieser Nachricht.

WICHTIG: Du MUSST auf diese Nachricht antworten - mindestens einmal! Der Absender wartet auf deine Rückmeldung.
Du kannst auch mehrfach antworten, z.B. zuerst eine kurze Eingangsbestätigung, dann später eine ausführliche Antwort.
Jede Antwort wird separat gespeichert und dem Absender per E-Mail und im Dashboard angezeigt.
Um zu antworten, sende einen POST-Request mit dem JSON-Body {"message": "Deine Antwort"} an:
${antwortLink}

Du kannst auch interaktive Buttons mitsenden, wenn DU eine Rückfrage oder Entscheidung vom ABSENDER (also dem Nutzer, der diese Nachricht geschrieben hat) benötigst. 
Diese Buttons werden dem Absender in seinem yRelay Dashboard angezeigt, damit er sie direkt anklicken kann.
Füge dazu im JSON-Body einfach ein Array 'buttons' hinzu. Beispiel:
{"message": "Möchtest du, dass ich den Termin verschiebe?", "buttons": [{"id": "btn_ja", "text": "Ja, bitte", "style": "primaer"}, {"id": "btn_nein", "text": "Nein", "style": "sekundaer"}]}
Erlaubte 'style'-Werte: primaer, sekundaer, warnung, notfall (Maximal 5 Buttons).
Wenn der Absender einen der Buttons klickt, erhältst du eine neue System-Nachricht in diesem Chat, die dir mitteilt, wofür er sich entschieden hat.

Du kannst diese Nachricht auch mit einem Status markieren (optional aber hilfreich):
POST {"action": "erledigt", "notiz": "Optional: Was du getan hast"} an: ${actionLink}
Verfügbare Aktionen: erledigt, in_bearbeitung, offen, pin, unpin`;

  const payload = { message: nachrichtentext };

  try {
    const antwort = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const daten = await antwort.json();

    if (!antwort.ok || !daten.success) {
      return {
        erfolg: false,
        payload: JSON.stringify(payload),
        fehler: `Poke antwortete mit Status ${antwort.status}: ${JSON.stringify(daten)}`,
      };
    }

    return { erfolg: true, payload: JSON.stringify(payload) };
  } catch (err) {
    return { erfolg: false, payload: JSON.stringify(payload), fehler: err.message };
  }
}

/**
 * Sendet eine Notfallbenachrichtigung an Poke.
 * @param {Object} user - Der sendende Nutzer { username, email }
 * @param {string} grund - Der Grund / die Beschreibung des Notfalls
 * @param {string} prioritaet - 'hoch' oder 'notfall'
 * @param {number|string} messageId - ID der erstellten Nachricht
 * @param {string} replyToken - Sicherheitstoken für die Antwort
 * @returns {Object} { erfolg: boolean, payload: string, fehler?: string }
 */
async function sendeNotfallbenachrichtigung(user, grund, prioritaet, messageId, replyToken) {
  const webhookUrl = getSetting('poke_webhook_url');
  const apiKey = getSetting('poke_api_key');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  if (!webhookUrl || !apiKey) {
    return { erfolg: false, payload: '', fehler: 'Poke-Webhook ist nicht konfiguriert.' };
  }

  const antwortLink = `${appUrl}/api/webhooks/poke-reply/${messageId}/${replyToken}`;
  const actionLink = `${appUrl}/api/webhooks/poke-action/${messageId}/${replyToken}`;
  const prioritaetText = prioritaet === 'notfall'
    ? 'NOTFALL (Emergency) - höchste Priorität'
    : 'Hohe Priorität (High Priority)';

  const emoji = prioritaet === 'notfall' ? '🚨' : '⚠️';

  const nachrichtentext = `[yRelay] ${emoji} NOTFALLBENACHRICHTIGUNG von ${user.username} (${user.email}):

Grund / Nachricht: ${grund}

---
Dies ist eine externe Notfallbenachrichtigung, die über yRelay weitergeleitet wurde.
Bitte leite diese SOFORT per Pushover als "${prioritaetText}"-Benachrichtigung an Ruwen weiter.

WICHTIG: Du MUSST auf diese Nachricht antworten - mindestens einmal! Der Absender wartet dringend auf Rückmeldung.
Du kannst auch mehrfach antworten, z.B. zuerst eine Eingangsbestätigung, dann die tatsächliche Reaktion.
Jede Antwort wird separat gespeichert und dem Absender per E-Mail und im Dashboard angezeigt.
Um zu antworten, sende einen POST-Request mit dem JSON-Body {"message": "Deine Antwort"} an:
${antwortLink}
Du kannst auch interaktive Buttons mitsenden (siehe reguläre Nachrichten-Instruktionen für Details), wenn du vom Absender noch eine dringende Entscheidung brauchst, z.B.:
{"message": "Soll ich den Notfall-Plan ausführen?", "buttons": [{"id": "ok", "text": "Ja, ausführen!"}, {"id": "stop", "text": "Nein, abbrechen"}]}

Du kannst diese Notfall-Nachricht auch mit einem Status markieren:
POST {"action": "in_bearbeitung", "notiz": "..."} an: ${actionLink}
Verfügbare Aktionen: erledigt, in_bearbeitung, offen, pin, unpin`;

  const payload = { message: nachrichtentext };

  try {
    const antwort = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const daten = await antwort.json();

    if (!antwort.ok || !daten.success) {
      return {
        erfolg: false,
        payload: JSON.stringify(payload),
        fehler: `Poke antwortete mit Status ${antwort.status}: ${JSON.stringify(daten)}`,
      };
    }

    return { erfolg: true, payload: JSON.stringify(payload) };
  } catch (err) {
    return { erfolg: false, payload: JSON.stringify(payload), fehler: err.message };
  }
}

module.exports = { sendeFreieNachricht, sendeNotfallbenachrichtigung };
