// notify.js - Universeller Verteiler für System-Benachrichtigungen (E-Mail + ntfy)
const { sendNtfyNotification } = require('./ntfy');
const { sendeSystemBenachrichtigung } = require('./email');
const { getSetting } = require('../db');

/**
 * Sendet eine Push-Benachrichtigung (falls ntfy_topic existiert) 
 * und/oder eine E-Mail (falls email existiert) an einen Nutzer.
 * 
 * @param {Object} user - { email, username, ntfy_topic }
 * @param {Object} config - { betreff, inhalt, icon, farbe, ctaUrl, ctaText, ntfyTags, ntfyPriority }
 */
async function sendePushUndMail(user, config) {
  const { 
    betreff, 
    inhalt, 
    icon = 'ℹ️', 
    farbe = '#6366f1, #8b5cf6', 
    ctaUrl = null, 
    ctaText = 'Öffnen',
    ntfyTags = ['information_source'],
    ntfyPriority = 3
  } = config;

  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const urlToUse = ctaUrl || `${appUrl}/#dashboard`;

  const promises = [];

  if (user.ntfy_topic) {
    // Strip HTML from inhalt for ntfy
    const plainText = inhalt.replace(/<[^>]+>/g, '');
    promises.push(
      sendNtfyNotification(user.ntfy_topic, betreff, plainText, urlToUse, ntfyPriority, ntfyTags).catch(err => {
        console.error(`[yRelay] Fehler beim Senden von ntfy an ${user.username}:`, err);
      })
    );
  }

  if (user.email && user.email_notifications !== 0 && user.email_notifications !== false) {
    promises.push(
      sendeSystemBenachrichtigung(user.email, user.username, betreff, inhalt, icon, farbe, ctaUrl ? urlToUse : null, ctaText).catch(err => {
        console.error(`[yRelay] Fehler beim Senden von E-Mail an ${user.username}:`, err);
      })
    );
  }

  await Promise.allSettled(promises);
}

module.exports = { sendePushUndMail };
