// E-Mail-Service für yRelay (Einladungsmails via SMTP)
const nodemailer = require('nodemailer');
const { getSetting } = require('../db');

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
 * @param {string} headerAccent - CSS-Gradient-Farben für den Header (z.B. '#6366f1, #8b5cf6')
 * @param {string} bodyContent - HTML-Inhalt des E-Mail-Körpers
 */
function emailTemplate(headerIcon, headerTitle, headerSubtitle, headerAccent, bodyContent) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#080c14;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#080c14 0%,#0f172a 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Navbar -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:26px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">y</span><span style="font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-1px;">Relay</span>
            </td>
          </tr>

          <!-- Karte -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(99,102,241,0.25);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);">

              <!-- Header -->
              <tr>
                <td style="padding:32px 36px 24px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08));border-bottom:1px solid rgba(99,102,241,0.12);">
                  <div style="font-size:40px;margin-bottom:12px;">${headerIcon}</div>
                  <h1 style="margin:0;font-size:22px;font-weight:800;background:linear-gradient(135deg,${headerAccent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;">${headerTitle}</h1>
                  <p style="margin:8px 0 0;color:#64748b;font-size:13px;">${headerSubtitle}</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 36px;">
                  ${bodyContent}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 36px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="margin:0;color:#334155;font-size:11px;line-height:1.5;">Diese E-Mail wurde automatisch von yRelay gesendet.</p>
                </td>
              </tr>

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
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f5f9;">Willkommen, ${empfaengerName}! 👋</p>
    <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.7;">
      Du wurdest eingeladen, <strong style="color:#f1f5f9;">yRelay</strong> zu nutzen - ein sicheres Portal, über das du Nachrichten direkt an den Poke KI-Assistenten senden kannst.
    </p>
    <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.7;">
      Klicke auf den Button unten, um dein Konto zu aktivieren. Der Link ist <strong style="color:#6366f1;">48 Stunden</strong> gültig.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${einladungsLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(99,102,241,0.4);">Konto aktivieren →</a>
    </div>
    <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
        Falls der Button nicht funktioniert, kopiere diesen Link:<br>
        <a href="${einladungsLink}" style="color:#6366f1;word-break:break-all;font-size:11px;">${einladungsLink}</a>
      </p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: `Einladung zu yRelay für ${empfaengerName}`,
    html: emailTemplate('✉️', 'Du wurdest eingeladen', 'Dein persönlicher Zugang zu Poke', '#6366f1, #8b5cf6', body),
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
async function sendeAntwortMail(empfaengerEmail, empfaengerName, originalNachricht, neuePokeAntwort, istFolgeantwort = false, gemischterVerlauf = []) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  const subject = istFolgeantwort ? 'Poke hat nochmal geantwortet 🤖' : 'Poke hat auf deine Nachricht geantwortet 🤖';
  const headerAccent = istFolgeantwort ? '#8b5cf6, #6366f1' : '#06b6d4, #38bdf8';
  const headerTitle = istFolgeantwort ? 'Neue Antwort von Poke' : 'Poke hat geantwortet';

  // Bisheriger Verlauf (ohne die aktuelle Antwort von Poke) für Folgeantworten
  const bisherigenVerlauf = gemischterVerlauf.slice(0, -1);

  const verlaufHtml = (istFolgeantwort && bisherigenVerlauf.length > 0) ? `
    <div style="margin:24px 0;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0 0 14px;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">📜 Bisheriger Verlauf</p>
      ${bisherigenVerlauf.map(eintrag => {
        const isPoke = eintrag.von === 'poke';
        const zeitString = eintrag.time ? new Date(eintrag.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const bgColor = isPoke ? 'rgba(6,182,212,0.07)' : 'rgba(99,102,241,0.07)';
        const borderColor = isPoke ? '#0e7490' : '#4f46e5';
        const labelColor = isPoke ? '#22d3ee' : '#818cf8';
        const label = isPoke ? '🤖 Poke' : `👤 ${eintrag.name || empfaengerName}`;

        return `
          <div style="margin-bottom:10px;padding:12px 14px;background:${bgColor};border-left:3px solid ${borderColor};border-radius:6px;">
            <p style="margin:0 0 5px;font-size:11px;color:${labelColor};font-weight:600;">${label}${zeitString ? ' · ' + zeitString : ''}</p>
            <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.6;white-space:pre-wrap;">${eintrag.text}</p>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const body = `
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#f1f5f9;">Hallo ${empfaengerName},</p>

    <!-- Neue Poke-Antwort -->
    <div style="margin-bottom:20px;padding:20px;background:rgba(6,182,212,0.08);border-left:4px solid #06b6d4;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:700;color:#22d3ee;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🤖 Pokes ${istFolgeantwort ? 'neue ' : ''}Antwort</p>
      <p style="margin:0;color:#f8fafc;font-size:15px;line-height:1.7;white-space:pre-wrap;">${neuePokeAntwort}</p>
    </div>

    ${verlaufHtml}

    <!-- Ursprüngliche Nachricht -->
    <div style="margin-bottom:24px;padding:16px;background:rgba(148,163,184,0.05);border-left:4px solid #334155;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Deine ursprüngliche Nachricht</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;white-space:pre-wrap;">${originalNachricht.replace(/\[SPECIAL:[A-Z_]+\]\s*/g, '').split('\n\nHinweis für Poke:')[0]}</p>
    </div>

    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 12px rgba(99,102,241,0.35);">Zum Dashboard & Antworten →</a>
    </div>
    
    <div style="margin-top:24px;padding:16px;background:rgba(239, 68, 68, 0.1);border-left:4px solid #ef4444;border-radius:4px;">
      <p style="margin:0;color:#f87171;font-size:13px;font-weight:600;">⚠️ WICHTIG:</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Bitte antworte <strong>NICHT</strong> direkt auf diese E-Mail! Poke kann deine Antwort nur empfangen, wenn du sie über das yRelay Dashboard verschickst.</p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject,
    html: emailTemplate('🤖', headerTitle, 'Dein Poke-Assistent hat eine Nachricht', headerAccent, body),
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
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f5f9;">Hallo ${empfaengerName},</p>
    <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.7;">
      Jemand hat angefragt, dein yRelay-Passwort zurückzusetzen. Falls du das warst, klicke auf den Button unten. Der Link ist <strong style="color:#f59e0b;">1 Stunde</strong> gültig.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1a1000;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(245,158,11,0.4);">Neues Passwort vergeben →</a>
    </div>
    <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
        Falls du das nicht warst, ignoriere diese E-Mail einfach.<br>
        Link: <a href="${resetLink}" style="color:#f59e0b;word-break:break-all;font-size:11px;">${resetLink}</a>
      </p>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Passwort zurücksetzen 🔑',
    html: emailTemplate('🔑', 'Passwort zurücksetzen', 'Sicherheitsanfrage für dein Konto', '#f59e0b, #d97706', body),
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
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f5f9;">Hallo ${empfaengerName},</p>
    <div style="padding:20px;background:rgba(239,68,68,0.08);border-left:4px solid #ef4444;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#fca5a5;font-size:15px;line-height:1.7;">
        Dein Konto bei yRelay wurde von einem Administrator <strong>gesperrt</strong>. Du kannst dich aktuell nicht mehr einloggen und keine Nachrichten senden.
      </p>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Bitte wende dich an den Administrator, falls du Fragen hast.</p>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto wurde gesperrt 🔒',
    html: emailTemplate('🔒', 'Konto gesperrt', 'Dein Zugang wurde deaktiviert', '#ef4444, #dc2626', body),
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
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f5f9;">Hallo ${empfaengerName}! 🎉</p>
    <div style="padding:20px;background:rgba(16,185,129,0.08);border-left:4px solid #10b981;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;color:#6ee7b7;font-size:15px;line-height:1.7;">
        Dein Konto bei yRelay wurde von einem Administrator wieder <strong>entsperrt</strong>. Du kannst dich nun wieder wie gewohnt einloggen.
      </p>
    </div>
    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(16,185,129,0.4);">Zum Login →</a>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto ist wieder aktiv! 🎉',
    html: emailTemplate('✅', 'Konto reaktiviert', 'Du hast wieder vollen Zugriff', '#10b981, #059669', body),
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
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#f1f5f9;">Hallo ${empfaengerName},</p>
    <div style="padding:20px;background:rgba(245,158,11,0.08);border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-weight:700;color:#fbbf24;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">⚠️ Ausstehende Antwort</p>
      <p style="margin:0;color:#f8fafc;font-size:15px;line-height:1.7;">Poke hat auf deine Nachricht bisher <strong>noch nicht geantwortet</strong>. Das ist ungewöhnlich - schau gerne kurz nach oder sende die Nachricht erneut.</p>
    </div>
    <div style="padding:16px;background:rgba(255,255,255,0.03);border-left:4px solid #334155;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Deine Nachricht</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;white-space:pre-wrap;">${vorschau}${originalNachricht.length > 200 ? ' ...' : ''}</p>
    </div>
    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 12px rgba(99,102,241,0.35);">Zum Dashboard →</a>
    </div>
  `;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: '⚠️ Poke hat noch nicht geantwortet',
    html: emailTemplate('⏳', 'Ausstehende Antwort', 'Poke hat sich noch nicht gemeldet', '#f59e0b, #d97706', body),
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
async function sendeRueckfrageMail(empfaengerEmail, empfaengerName, originalNachricht, antwortText, buttons, nachrichtId, token, verlauf) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const appUrl = getSetting('app_url') || '';
  
  // Buttons als Links rendern
  const buttonsHtml = buttons.map(btn => {
    let bg = '#6366f1';
    if (btn.style === 'sekundaer') bg = '#475569';
    if (btn.style === 'warnung') bg = '#eab308';
    if (btn.style === 'notfall') bg = '#ef4444';
    
    const url = `${appUrl}/api/nachrichten/klick/${nachrichtId}/${token}/${encodeURIComponent(btn.id)}`;
    
    return `<a href="${url}" style="display:block;margin-bottom:10px;padding:14px 20px;background:${bg};color:white;text-decoration:none;border-radius:8px;font-weight:600;text-align:center;font-size:15px;">
      ${btn.text}
    </a>`;
  }).join('');

  const bodyContent = `
    <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:18px;">Rückfrage von Poke an ${empfaengerName},</h2>
    
    <div style="background:rgba(255,255,255,0.03);border-left:3px solid #6366f1;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Poke fragt:</p>
      <p style="margin:0;color:#f1f5f9;font-size:15px;line-height:1.6;white-space:pre-wrap;">${antwortText}</p>
    </div>
    
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#cbd5e1;font-size:14px;font-weight:600;">Bitte triff eine Entscheidung:</p>
      ${buttonsHtml}
    </div>

    ${appUrl ? `<div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}/#dashboard" style="display:inline-block;padding:10px 20px;background:transparent;color:#94a3b8;text-decoration:underline;font-size:13px;">Oder im Dashboard beantworten</a>
    </div>` : ''}
  `;

  const html = emailTemplate(
    '❓',
    'Rückfrage von Poke',
    'Poke benötigt eine Entscheidung von dir',
    '#f59e0b, #d97706',
    bodyContent
  );

  try {
    const info = await transporter.sendMail({
      from: `"yRelay" <${getSetting('smtp_from') || getSetting('smtp_user')}>`,
      to: empfaengerEmail,
      subject: `[yRelay] Rückfrage von Poke`,
      html,
    });
    return { erfolg: true, messageId: info.messageId };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

module.exports = { 
  sendeEinladungsmail, 
  testeSMTP, 
  sendeAntwortMail, 
  sendePasswortResetMail, 
  sendeKontoGesperrtMail, 
  sendeKontoAktiviertMail, 
  sendeAusstehendeAntwortMail,
  sendeRueckfrageMail 
};
