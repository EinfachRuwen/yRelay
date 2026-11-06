// E-Mail-Service für yRelay (Einladungsmails via SMTP)
const nodemailer = require('nodemailer');
const { getSetting } = require('../db');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

/**
 * Erstellt einen Nodemailer-Transporter mit den aktuellen Einstellungen.
 */
function erstelleTransporter() {
  const host = getSetting('smtp_host');
  const port = parseInt(getSetting('smtp_port') || '587', 10);
  const user = getSetting('smtp_user');
  const pass = getSetting('smtp_pass');

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Gibt einen einheitlichen E-Mail-Wrapper (Header + Footer) zurück.
 * @param {string} headerIcon - Emoji/Icon für den Header
 * @param {string} headerTitle - Titel im Header
 * @param {string} headerSubtitle - Untertitel im Header
 * @param {string} headerAccent - CSS-Gradient-Farben für den Header (z.B. '#0e518d, #0e518d')
 * @param {string} bodyContent - HTML-Inhalt des E-Mail-Körpers
 */
function emailTemplate(headerIcon, headerTitle, headerSubtitle, headerAccent, bodyContent) {
  // Akzent aus den alten Verlaufsangaben auf RAL-Verkehrsfarben abbilden (Kopfband der Karte)
  const erste = String(headerAccent || '').split(',')[0].trim().toLowerCase();
  const akzent = ({ '#e5531f': '#e5531f', '#b8400f': '#e5531f', '#c4120f': '#c4120f', '#dc2626': '#c4120f', '#00774a': '#00774a', '#00774a': '#00774a' })[erste] || '#0e518d';
  const schrift = "'DIN Alternate','Bahnschrift','Segoe UI',Arial,sans-serif";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#eceeed;font-family:${schrift};color:#1c1e1f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eceeed;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="padding-bottom:18px;">
              <span style="display:inline-block;background-color:#0e518d;color:#ffffff;font-family:${schrift};font-size:22px;font-weight:700;padding:7px 14px;border-radius:2px;">yRelay</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #d5d9d7;border-top:6px solid ${akzent};border-radius:5px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 32px 6px;">
                    <h1 style="margin:0;font-family:${schrift};font-size:26px;line-height:1.15;font-weight:700;color:#1c1e1f;">${headerTitle}</h1>
                    ${headerSubtitle ? `<p style="margin:6px 0 0;color:#464c4b;font-size:15px;">${headerSubtitle}</p>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 32px 30px;font-size:16px;line-height:1.5;color:#1c1e1f;">
                    ${bodyContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 4px;">
              <p style="margin:0;color:#646b6a;font-size:12px;line-height:1.5;">Automatisch gesendet von yRelay.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sendet eine Einladungsmail an einen neuen Nutzer.
 */
async function sendeEinladungsmail(empfaengerEmail, empfaengerName, einladungsToken) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const einladungsLink = `${appUrl}/#einladung/${einladungsToken}`;

  const body = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1c1e1f;">Willkommen, ${empfaengerName}!</p>
    <p style="margin:0 0 16px;color:#464c4b;font-size:15px;line-height:1.7;">
      Du wurdest eingeladen, <strong style="color:#1c1e1f;">yRelay</strong> zu nutzen - ein sicheres Portal, über das du Nachrichten direkt an den Poke KI-Assistenten senden kannst.
    </p>
    <p style="margin:0 0 28px;color:#464c4b;font-size:15px;line-height:1.7;">
      Klicke auf den Button unten, um dein Konto zu aktivieren. Der Link ist <strong style="color:#0e518d;">48 Stunden</strong> gültig.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${einladungsLink}" style="display:inline-block;padding:14px 36px;background-color:#0e518d;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:3px;">Konto aktivieren</a>
    </div>
    <div style="padding:16px;background:#f5f6f5;border-radius:8px;border:1px solid #f5f6f5;">
      <p style="margin:0;color:#646b6a;font-size:12px;line-height:1.6;">
        Falls der Button nicht funktioniert, kopiere diesen Link:<br>
        <a href="${einladungsLink}" style="color:#0e518d;word-break:break-all;font-size:11px;">${einladungsLink}</a>
      </p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: `Einladung zu yRelay für ${empfaengerName}`,
    html: emailTemplate('✉️', 'Du wurdest eingeladen', 'Dein persönlicher Zugang zu Poke', '#0e518d, #0e518d', body),
  };

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler:', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Testet die SMTP-Verbindung.
 */
async function testeSMTP() {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };
  try {
    await transporter.verify();
    return { erfolg: true };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine Benachrichtigung, wenn Poke geantwortet hat.
 * @param {string} empfaengerEmail
 * @param {string} empfaengerName
 * @param {string} originalNachricht
 * @param {string} neuePokeAntwort - Die neue Antwort von Poke
 * @param {boolean} istFolgeantwort
 * @param {Array} gemischterVerlauf - Chronologisch gemischter Verlauf mit { text, time, von, name? }
 */
async function sendeAntwortMail(empfaengerEmail, empfaengerName, originalNachricht, neuePokeAntwort, istFolgeantwort = false, gemischterVerlauf = [], pokeName = 'Poke') {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const safePokeName = escapeHtml(pokeName);
  const safeEmpfaengerName = escapeHtml(empfaengerName);
  const safeAntwort = escapeHtml(neuePokeAntwort);
  const safeOriginalNachricht = escapeHtml(originalNachricht.replace(/\[SPECIAL:[A-Z_]+\]\s*/g, '').split('\n\nHinweis für Poke:')[0]);

  const betreff = istFolgeantwort ? `Antwort von ${pokeName} erhalten 🤖` : `${pokeName} hat auf deine Anfrage reagiert! 🚀`;
  const headerTitel = istFolgeantwort ? 'Folgeantwort' : 'Neue Antwort';
  const headerIcon = '🤖';
  const headerSubtitle = `${safePokeName} hat eine Nachricht für dich.`;
  const headerAccent = istFolgeantwort ? '#0e518d, #0e518d' : '#0e518d, #0e518d';

  // Bisheriger Verlauf (ohne die aktuelle Antwort von Poke) für Folgeantworten
  const bisherigenVerlauf = gemischterVerlauf.slice(0, -1);

  const verlaufHtml = (istFolgeantwort && bisherigenVerlauf.length > 0) ? `
    <div style="margin:24px 0;padding:16px;background:#f5f6f5;border-radius:10px;border:1px solid #f5f6f5;">
      <p style="margin:0 0 14px;font-weight:700;color:#646b6a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">📜 Bisheriger Verlauf</p>
      ${bisherigenVerlauf.map(eintrag => {
        const isPoke = eintrag.von === 'poke';
        const zeitString = eintrag.time ? new Date(eintrag.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const bgColor = isPoke ? '#e3edf6' : '#e3edf6';
        const borderColor = isPoke ? '#0e7490' : '#4f46e5';
        const labelColor = isPoke ? '#0e518d' : '#818cf8';
        const label = isPoke ? `🤖 ${safePokeName}` : `👤 ${escapeHtml(eintrag.name || empfaengerName)}`;

        return `
          <div style="margin-bottom:10px;padding:12px 14px;background:${bgColor};border-left:3px solid ${borderColor};border-radius:6px;">
            <p style="margin:0 0 5px;font-size:11px;color:${labelColor};font-weight:600;">${label}${zeitString ? ' · ' + zeitString : ''}</p>
            <p style="margin:0;color:#1c1e1f;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(eintrag.text)}</p>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const body = `
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#1c1e1f;">Hallo ${safeEmpfaengerName},</p>

    <!-- Neue Poke-Antwort -->
    <div style="margin-bottom:20px;padding:20px;background:#e3edf6;border-left:4px solid #0e518d;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:700;color:#0e518d;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🤖 ${safePokeName}s ${istFolgeantwort ? 'neue ' : ''}Antwort</p>
      <p style="margin:0;color:#1c1e1f;font-size:15px;line-height:1.7;white-space:pre-wrap;">${safeAntwort}</p>
    </div>

    ${verlaufHtml}

    <!-- Ursprüngliche Nachricht -->
    <div style="margin-bottom:24px;padding:16px;background:#f5f6f5;border-left:4px solid #646b6a;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:600;color:#646b6a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Deine ursprüngliche Nachricht</p>
      <p style="margin:0;color:#464c4b;font-size:13px;line-height:1.6;white-space:pre-wrap;">${safeOriginalNachricht}</p>
    </div>

    <div style="text-align:center;">
      <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 28px;background-color:#0e518d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:3px;">Zum Dashboard & Antworten</a>
    </div>
    
    <div style="margin-top:24px;padding:16px;background:#fbe6e5;border-left:4px solid #c4120f;border-radius:4px;">
      <p style="margin:0;color:#f87171;font-size:13px;font-weight:600;">⚠️ WICHTIG:</p>
      <p style="margin:4px 0 0;color:#464c4b;font-size:13px;">Bitte antworte <strong>NICHT</strong> direkt auf diese E-Mail! ${safePokeName} kann deine Antwort nur empfangen, wenn du sie über das yRelay Dashboard verschickst.</p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: betreff,
    html: emailTemplate(headerIcon, headerTitel, headerSubtitle, headerAccent, body),
  };

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler (Antwort):', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine Passwort-Zurücksetzen-Link.
 */
async function sendePasswortResetMail(empfaengerEmail, empfaengerName, resetToken) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const resetLink = `${appUrl}/#reset/${resetToken}`;

  const body = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1c1e1f;">Hallo ${empfaengerName},</p>
    <p style="margin:0 0 16px;color:#464c4b;font-size:15px;line-height:1.7;">
      Jemand hat angefragt, dein yRelay-Passwort zurückzusetzen. Falls du das warst, klicke auf den Button unten. Der Link ist <strong style="color:#e5531f;">1 Stunde</strong> gültig.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block;padding:14px 36px;background-color:#e5531f;color:#1c1e1f;font-size:15px;font-weight:700;text-decoration:none;border-radius:3px;">Neues Passwort vergeben</a>
    </div>
    <div style="padding:16px;background:#f5f6f5;border-radius:8px;border:1px solid #f5f6f5;">
      <p style="margin:0;color:#646b6a;font-size:12px;line-height:1.6;">
        Falls du das nicht warst, ignoriere diese E-Mail einfach.<br>
        Link: <a href="${resetLink}" style="color:#e5531f;word-break:break-all;font-size:11px;">${resetLink}</a>
      </p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Passwort zurücksetzen 🔑',
    html: emailTemplate('🔑', 'Passwort zurücksetzen', 'Sicherheitsanfrage für dein Konto', '#e5531f, #b8400f', body),
  };

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine Benachrichtigung, wenn ein Konto gesperrt wurde.
 */
async function sendeKontoGesperrtMail(empfaengerEmail, empfaengerName) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');

  const body = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1c1e1f;">Hallo ${empfaengerName},</p>
    <div style="padding:20px;background:#fbe6e5;border-left:4px solid #c4120f;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#fca5a5;font-size:15px;line-height:1.7;">
        Dein Konto bei yRelay wurde von einem Administrator <strong>gesperrt</strong>. Du kannst dich aktuell nicht mehr einloggen und keine Nachrichten senden.
      </p>
    </div>
    <p style="margin:0;color:#646b6a;font-size:13px;line-height:1.6;">Bitte wende dich an den Administrator, falls du Fragen hast.</p>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto wurde gesperrt 🔒',
    html: emailTemplate('🔒', 'Konto gesperrt', 'Dein Zugang wurde deaktiviert', '#c4120f, #dc2626', body),
  };

  transporter.sendMail(mailOptionen).catch(() => {});
  return { erfolg: true };
}

/**
 * Sendet eine Benachrichtigung, wenn ein Konto reaktiviert wurde.
 */
async function sendeKontoAktiviertMail(empfaengerEmail, empfaengerName) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  const body = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1c1e1f;">Hallo ${empfaengerName}!</p>
    <div style="padding:20px;background:#def1e8;border-left:4px solid #00774a;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;color:#6ee7b7;font-size:15px;line-height:1.7;">
        Dein Konto bei yRelay wurde von einem Administrator wieder <strong>entsperrt</strong>. Du kannst dich nun wieder wie gewohnt einloggen.
      </p>
    </div>
    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background-color:#00774a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:3px;">Zum Login</a>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto ist wieder aktiv! 🎉',
    html: emailTemplate('✅', 'Konto reaktiviert', 'Du hast wieder vollen Zugriff', '#00774a, #00774a', body),
  };

  transporter.sendMail(mailOptionen).catch(() => {});
  return { erfolg: true };
}

/**
 * Benachrichtigt den Nutzer, dass Poke noch nicht geantwortet hat.
 */
async function sendeAusstehendeAntwortMail(empfaengerEmail, empfaengerName, originalNachricht) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  // Nachrichtenvorschau kürzen und Poke-Hints entfernen
  const vorschau = originalNachricht
    .replace(/\[SPECIAL:[A-Z_]+\]\s*/g, '')
    .split('\n\nHinweis für Poke:')[0]
    .slice(0, 200);

  const body = `
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#1c1e1f;">Hallo ${empfaengerName},</p>
    <div style="padding:20px;background:#fdebe3;border-left:4px solid #e5531f;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-weight:700;color:#fbbf24;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">⚠️ Ausstehende Antwort</p>
      <p style="margin:0;color:#1c1e1f;font-size:15px;line-height:1.7;">Poke hat auf deine Nachricht bisher <strong>noch nicht geantwortet</strong>. Das ist ungewöhnlich - schau gerne kurz nach oder sende die Nachricht erneut.</p>
    </div>
    <div style="padding:16px;background:#f5f6f5;border-left:4px solid #646b6a;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-weight:600;color:#646b6a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Deine Nachricht</p>
      <p style="margin:0;color:#464c4b;font-size:13px;line-height:1.6;white-space:pre-wrap;">${vorschau}${originalNachricht.length > 200 ? ' ...' : ''}</p>
    </div>
    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background-color:#0e518d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:3px;">Zum Dashboard</a>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: '⚠️ Poke hat noch nicht geantwortet',
    html: emailTemplate('⏳', 'Ausstehende Antwort', 'Poke hat sich noch nicht gemeldet', '#e5531f, #b8400f', body),
  };

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler (ausstehende Antwort):', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine Rückfragen-Mail mit interaktiven Entscheidungs-Buttons.
 */
async function sendeRueckfrageMail(empfaengerEmail, empfaengerName, originalNachricht, antwortText, buttons, nachrichtId, token, verlauf = [], pokeName = 'Poke') {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const appUrl = getSetting('app_url') || '';
  const safePokeName = escapeHtml(pokeName);
  const safeEmpfaengerName = escapeHtml(empfaengerName);
  const safeAntwort = escapeHtml(antwortText);
  
  // Buttons als Links rendern
  const buttonsHtml = buttons.map(btn => {
    let bg = '#0e518d';
    if (btn.style === 'sekundaer') bg = '#646b6a';
    if (btn.style === 'warnung') bg = '#eab308';
    if (btn.style === 'notfall') bg = '#c4120f';
    
    const url = `${appUrl}/api/nachrichten/klick/${nachrichtId}/${token}/${encodeURIComponent(btn.id)}`;
    
    return `<a href="${url}" style="display:block;margin-bottom:10px;padding:14px 20px;background:${bg};color:white;text-decoration:none;border-radius:8px;font-weight:600;text-align:center;font-size:15px;">
      ${escapeHtml(btn.text)}
    </a>`;
  }).join('');

  const bodyContent = `
    <h2 style="margin:0 0 16px;color:#1c1e1f;font-size:18px;">Rückfrage von ${safePokeName} an ${safeEmpfaengerName},</h2>
    
    <div style="background:#f5f6f5;border:1px solid #d5d9d7;padding:16px;margin-bottom:24px;border-radius:3px;">
      <p style="margin:0;color:#464c4b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${safePokeName} fragt:</p>
      <p style="margin:0;color:#1c1e1f;font-size:15px;line-height:1.6;white-space:pre-wrap;">${safeAntwort}</p>
    </div>
    
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#1c1e1f;font-size:14px;font-weight:600;">Bitte triff eine Entscheidung:</p>
      ${buttonsHtml}
    </div>

    ${appUrl ? `<div style="text-align:center;margin-top:24px;">
      <a href="${escapeHtml(appUrl)}/#dashboard" style="display:inline-block;padding:10px 20px;background:transparent;color:#464c4b;text-decoration:underline;font-size:13px;">Oder im Dashboard beantworten</a>
    </div>` : ''}
  `;

  const html = emailTemplate(
    '❓',
    'Aktion erforderlich',
    `${safePokeName} benötigt eine Entscheidung von dir.`,
    '#e5531f, #b8400f',
    bodyContent
  );

  try {
    const info = await transporter.sendMail({
      from: `"yRelay" <${getSetting('smtp_from') || getSetting('smtp_user')}>`,
      to: empfaengerEmail,
      subject: `[yRelay] Rückfrage von ${pokeName}`,
      html,
    });
    return { erfolg: true, messageId: info.messageId };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Versendet eine universelle Systembenachrichtigung (E-Mail).
 */
async function sendeSystemBenachrichtigung(empfaengerEmail, empfaengerName, betreff, inhalt, icon = 'ℹ️', gradientFarben = '#0e518d, #0e518d', ctaUrl = null, ctaText = 'Öffnen') {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');

  let ctaHtml = '';
  if (ctaUrl) {
    ctaHtml = `
      <div style="text-align:center;margin: 28px 0;">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background-color:#0e518d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:3px;">${ctaText}</a>
      </div>
    `;
  }

  const body = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1c1e1f;">Hallo ${empfaengerName},</p>
    <div style="color:#464c4b;font-size:15px;line-height:1.7;">
      ${inhalt}
    </div>
    ${ctaHtml}
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: betreff,
    html: emailTemplate(icon, betreff, 'System-Benachrichtigung', gradientFarben, body),
  };

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler (SystemBenachrichtigung):', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

async function sendeAgentenNachricht(empfaengerEmail, agentName, nachricht, antwortUrl, websiteModus) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };
  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const safeName = escapeHtml(agentName);
  const safeMessage = escapeHtml(nachricht);
  const text = websiteModus
    ? `${nachricht}\n\nAntworten: ${antwortUrl}`
    : `${nachricht}\n\nSende deine Antwort als POST-Request mit JSON {"message":"..."} an ${antwortUrl}`;
  const replyMarkup = websiteModus
    ? `<a href="${escapeHtml(antwortUrl)}" style="color:#0e518d;">${escapeHtml(antwortUrl)}</a>`
    : `<code style="word-break:break-all;color:#0e518d;">${escapeHtml(antwortUrl)}</code>`;
  const body = `
    <p style="color:#1c1e1f;font-size:15px;">${safeMessage.replace(/\n/g, '<br>')}</p>
    <p style="color:#464c4b;font-size:13px;">${websiteModus ? 'Öffne die geschützte Antwortseite:' : 'Sende deine Antwort an diesen API-Endpunkt:'}</p>
    <p style="word-break:break-all;">${replyMarkup}</p>
  `;
  try {
    await transporter.sendMail({
      from: `"yRelay" <${absender}>`,
      to: empfaengerEmail,
      subject: `Neue Nachricht für ${agentName}`,
      text,
      html: emailTemplate('🤖', `Nachricht für ${safeName}`, 'Neue Anfrage über yRelay', '#0e518d, #0e518d', body),
    });
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler (Agent):', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

async function sendeAgentenAuftrag(empfaengerEmail, agentName, betreff, nachricht) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };
  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const linkedText = escapeHtml(nachricht).replace(/https?:\/\/[^\s<]+/g, url =>
    `<a href="${url}" style="color:#0e518d;word-break:break-all;">${url}</a>`
  );
  try {
    await transporter.sendMail({
      from: `"yRelay" <${absender}>`,
      to: empfaengerEmail,
      subject: betreff,
      text: nachricht,
      html: emailTemplate('🤖', escapeHtml(betreff), `Auftrag für ${escapeHtml(agentName)}`, '#0e518d, #0e518d',
        `<div style="white-space:pre-wrap;color:#1c1e1f;font:14px/1.7 monospace;">${linkedText}</div>`),
    });
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] E-Mail-Fehler (Agentenauftrag):', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine manuelle E-Mail aus dem Admin-Panel.
 */
async function sendeManuelleMail({ to, cc, bcc, subject, text, html }) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');

  const mailOptionen = {
    from: `"yRelay Admin" <${absender}>`,
    to: to,
    subject: subject,
  };

  if (cc) mailOptionen.cc = cc;
  if (bcc) mailOptionen.bcc = bcc;

  if (html) {
    mailOptionen.html = html;
    // Falls nur HTML geschickt wird, aber ein rudimentärer Text gesucht wird:
    if (!text) mailOptionen.text = html.replace(/<[^>]*>?/gm, '');
  }
  if (text) mailOptionen.text = text;

  try {
    await transporter.sendMail(mailOptionen);
    return { erfolg: true };
  } catch (err) {
    console.error('[yRelay] Fehler beim manuellen E-Mail Versand:', err.message);
    return { erfolg: false, fehler: err.message };
  }
}

module.exports = {
  sendeEinladungsmail,
  sendePasswortResetMail,
  sendeKontoGesperrtMail,
  sendeKontoAktiviertMail,
  sendeAntwortMail,
  sendeRueckfrageMail,
  sendeSystemBenachrichtigung,
  sendeAgentenNachricht,
  sendeAgentenAuftrag,
  sendeManuelleMail,
  testeSMTP,
};
