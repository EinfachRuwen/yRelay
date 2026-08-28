// Ntfy-Service für Push-Benachrichtigungen
const { getSetting } = require('../db');

/**
 * Sendet eine Push-Benachrichtigung über ntfy.sh
 * @param {string} topic - Das ntfy Topic (z.B. "yrelay-ruwen-xyz")
 * @param {string} title - Der Titel der Benachrichtigung
 * @param {string} message - Der Nachrichtentext
 * @param {string} clickUrl - Optionale URL, die beim Klicken geöffnet wird
 * @param {number} priority - Priorität (1-5, 3 ist Standard, 5 ist Notfall)
 * @param {string[]} tags - Arrays von Emoji-Tags (z.B. ["robot", "warning"])
 */
async function sendNtfyNotification(topic, title, message, clickUrl = null, priority = 3, tags = []) {
  if (!topic) return { erfolg: false, fehler: 'Kein Topic angegeben' };

  // ntfy.sh Header Encoding für Sonderzeichen (UTF-8)
  const encodedTitle = Buffer.from(title, 'utf-8').toString('latin1');

  const headers = {
    'Title': encodedTitle,
    'Priority': priority.toString(),
  };

  if (clickUrl) {
    headers['Click'] = clickUrl;
  }

  if (tags && tags.length > 0) {
    headers['Tags'] = tags.join(',');
  }

  try {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: message,
      headers: headers
    });

    if (!response.ok) {
      return { erfolg: false, fehler: `ntfy antwortete mit Status ${response.status}` };
    }

    return { erfolg: true };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

module.exports = { sendNtfyNotification };
