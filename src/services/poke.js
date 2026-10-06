// KI-Agent-Zustelldienst für yRelay
const { getSetting } = require('../db');

async function sendeAgentenAuftrag(user, inhalt, agent = null, extraPayload = {}) {
  const agentName = agent?.name || 'KI-Agent';
  const payload = { message: inhalt, ...extraPayload };
  if (agent?.transport === 'email') {
    if (!agent.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent.email)) {
      return { erfolg: false, payload: JSON.stringify(payload), fehler: `Für ${agentName} ist keine gültige E-Mail-Adresse konfiguriert.` };
    }
    const { sendeAgentenAuftrag: sendeMailAuftrag } = require('./email');
    const mailText = extraPayload.buttons?.length
      ? `${inhalt}\n\nZusätzliche Aktionen: ${JSON.stringify(extraPayload.buttons)}`
      : inhalt;
    const ergebnis = await sendeMailAuftrag(agent.email, agentName, `Neue Aufgabe für ${agentName}`, mailText);
    return { erfolg: ergebnis.erfolg, payload: JSON.stringify(payload), fehler: ergebnis.fehler };
  }

  const webhookUrl = agent?.webhook_url || getSetting('poke_webhook_url');
  const apiKey = agent?.api_key || getSetting('poke_api_key');
  if (!webhookUrl || !apiKey) {
    return { erfolg: false, payload: JSON.stringify(payload), fehler: `Der Webhook für ${agentName} ist nicht konfiguriert.` };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    const usesPokeApi = !agent || /poke/i.test(agent.name || '');
    if (!response.ok || result.success === false || (usesPokeApi && !result.success)) {
      return {
        erfolg: false,
        payload: JSON.stringify(payload),
        fehler: `${agentName} antwortete mit Status ${response.status}: ${JSON.stringify(result)}`,
      };
    }
    return { erfolg: true, payload: JSON.stringify(payload) };
  } catch (err) {
    return { erfolg: false, payload: JSON.stringify(payload), fehler: err.message };
  }
}

async function sendeAnAgenten(user, inhalt, messageId, replyToken, agent = null, notfall = null) {
  const agentName = agent?.name || 'KI-Agent';
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const replyRoute = !agent || /poke/i.test(agent.name || '') ? 'poke-reply' : 'agent-reply';
  const antwortApi = `${appUrl}/api/webhooks/${replyRoute}/${messageId}/${replyToken}`;
  const antwortLink = agent?.interface_mode === 'website'
    ? `${appUrl}/agent/${messageId}/${replyToken}`
    : antwortApi;
  const actionLink = `${appUrl}/api/webhooks/poke-action/${messageId}/${replyToken}`;
  const text = notfall
    ? `[yRelay] ${notfall.emoji} ${notfall.label} von ${user.username} (${user.email || 'keine E-Mail'}):\n\n${inhalt}\n\nBitte leite diese Nachricht SOFORT per Pushover als "${notfall.prioritaetText}" an den zuständigen Empfänger weiter.`
    : `[yRelay] Externe Nachricht von ${user.username} (${user.email || 'keine E-Mail'}):\n\n${inhalt}`;
  const antwortInstruktion = agent?.interface_mode === 'website'
    ? `Öffne die Antwort-Webseite und trage dort deine Antwort ein: ${antwortLink}\nDie Webseite bietet Felder für Antwort, optionale Buttons und Statusaktionen. Verwende für Buttons ein JSON-Array wie im Beispiel unten.`
    : `Antworte per POST mit dem JSON-Body {"message":"Deine Antwort"} an:\n${antwortApi}`;
  const statusInstruktion = agent?.interface_mode === 'website'
    ? 'Statusaktionen erledigst du über die Statusauswahl auf derselben Antwort-Webseite.'
    : `Statusaktionen: POST {"action":"erledigt","notiz":"Optional: Was du getan hast"} an ${actionLink}. Verfügbar: erledigt, in_bearbeitung, offen, pin, unpin.`;
  const prioritaetsHinweis = notfall
    ? `\n\nWICHTIG: Dies ist ${notfall.label}. Reagiere sofort und behandle es mit der Priorität "${notfall.prioritaetText}". Antworte dem Absender mindestens einmal und leite die Information an den zuständigen Empfänger weiter.`
    : '';
  const notfallButtonHinweis = notfall
    ? `\n\nWenn du vom Absender noch eine dringende Entscheidung brauchst, kannst du z.B. diese Buttons anbieten:\n{"message":"Soll ich den Notfall-Plan ausführen?","buttons":[{"id":"ok","text":"Ja, ausführen!"},{"id":"stop","text":"Nein, abbrechen"}]}`
    : '';
  const notfallStatusHinweis = notfall
    ? (agent?.interface_mode === 'website'
      ? '\nSetze den Status während der Bearbeitung über die Statusauswahl auf „in Bearbeitung“. '
      : `\nMarkiere die Notfall-Nachricht während der Bearbeitung mit POST {"action":"in_bearbeitung","notiz":"..."} an: ${actionLink}.`)
    : '';
  const nachrichtentext = `${text}

Dies ist eine externe Nachricht, die über yRelay weitergeleitet wurde. Bitte informiere den zuständigen Empfänger über den Eingang.

WICHTIG: Du MUSST auf diese Nachricht antworten - mindestens einmal! Der Absender wartet auf deine Rückmeldung.
Du kannst mehrfach antworten, zum Beispiel zuerst eine kurze Eingangsbestätigung und später eine ausführliche Antwort. Jede Antwort wird separat gespeichert und dem Absender per E-Mail und im Dashboard angezeigt.
${antwortInstruktion}

Du kannst interaktive Buttons mitsenden, wenn du eine Rückfrage oder Entscheidung des Absenders benötigst. Diese werden im yRelay-Dashboard angezeigt. Füge dazu das Feld "buttons" hinzu. Beispiel:
{"message":"Möchtest du, dass ich den Termin verschiebe?","buttons":[{"id":"btn_ja","text":"Ja, bitte","style":"primaer"},{"id":"btn_nein","text":"Nein, danke","style":"sekundaer"}]}
Erlaubte Button-Stile: primaer, sekundaer, warnung, notfall (maximal 5 Buttons). Wenn der Absender einen Button klickt, erhältst du eine neue System-Nachricht mit seiner Entscheidung.

Du kannst die Nachricht mit einem Status markieren (optional, aber hilfreich). ${statusInstruktion}${prioritaetsHinweis}${notfallButtonHinweis}${notfallStatusHinweis}

Antworte in deiner Rolle als ${agentName}.`;

  return sendeAgentenAuftrag(user, nachrichtentext, agent);
}

async function sendeFreieNachricht(user, inhalt, messageId, replyToken, agent = null) {
  return sendeAnAgenten(user, inhalt, messageId, replyToken, agent);
}

async function sendeSystemHinweis(user, inhalt, messageId, replyToken, agent = null) {
  return sendeAnAgenten(user, inhalt, messageId, replyToken, agent);
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
async function sendeNotfallbenachrichtigung(user, grund, prioritaet, messageId, replyToken, agent = null) {
  const prioritaetText = prioritaet === 'notfall'
    ? 'NOTFALL (Emergency) - höchste Priorität'
    : 'Hohe Priorität (High Priority)';
  const notfall = {
    emoji: prioritaet === 'notfall' ? '🚨' : '⚠️',
    label: prioritaet === 'notfall' ? 'NOTFALLBENACHRICHTIGUNG' : 'Hohe Priorität',
    prioritaetText,
  };
  return sendeAnAgenten(user, grund, messageId, replyToken, agent, notfall);
}

module.exports = { sendeFreieNachricht, sendeNotfallbenachrichtigung, sendeSystemHinweis, sendeAgentenAuftrag };
