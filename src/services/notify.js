// Universeller Verteiler für E-Mail-, ntfy- und Pushover-Benachrichtigungen
const { sendNtfyNotification } = require('./ntfy');
const { sendeSystemBenachrichtigung } = require('./email');
const { getSetting } = require('../db');

/**
 * Sendet Benachrichtigungen über alle für den Nutzer konfigurierten Kanäle.
 * 
 * @param {Object} user - { email, username, ntfy_topic, pushover_user_key }
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

  const pushoverToken = getSetting('pushover_app_token');
  if (user.pushover_user_key && pushoverToken) {
    const message = inhalt.replace(/<[^>]+>/g, '');
    const pushoverPriority = ntfyPriority >= 5 ? 2 : (ntfyPriority >= 4 ? 1 : 0);
    const pushoverPayload = new URLSearchParams({
      token: pushoverToken,
      user: user.pushover_user_key,
      title: betreff,
      message,
      url: urlToUse,
      priority: String(pushoverPriority),
    });
    if (pushoverPriority === 2) {
      pushoverPayload.set('retry', '30');
      pushoverPayload.set('expire', '3600');
    }
    promises.push(
      fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: pushoverPayload,
      }).then(async response => {
        const result = await response.json();
        if (!response.ok || result.status !== 1) {
          throw new Error(result.errors?.join(', ') || `Pushover antwortete mit Status ${response.status}`);
        }
      }).catch(err => {
        console.error(`[yRelay] Fehler beim Senden von Pushover an ${user.username}:`, err);
      })
    );
  }

  if (user.ntfy_topic) {
    // Strip HTML from inhalt for ntfy
    const plainText = inhalt.replace(/<[^>]+>/g, '');
    promises.push(
      sendNtfyNotification(user.ntfy_topic, betreff, plainText, urlToUse, ntfyPriority, ntfyTags).catch(err => {
        console.error(`[yRelay] Fehler beim Senden von ntfy an ${user.username}:`, err);
      })
    );
  }

  if (!config.nurPush && user.email && String(user.email_notifications) !== '0' && String(user.email_notifications) !== 'false') {
    promises.push(
      sendeSystemBenachrichtigung(user.email, user.username, betreff, inhalt, icon, farbe, ctaUrl ? urlToUse : null, ctaText).catch(err => {
        console.error(`[yRelay] Fehler beim Senden von E-Mail an ${user.username}:`, err);
      })
    );
  }

  await Promise.allSettled(promises);
}

module.exports = { sendePushUndMail };
