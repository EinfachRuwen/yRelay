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
 * Sendet eine Einladungsmail an einen neuen Nutzer.
 * @param {string} empfaengerEmail - E-Mail-Adresse des Empfängers
 * @param {string} empfaengerName - Benutzername des Empfängers
 * @param {string} einladungsToken - Einmaliger Einladungstoken
 * @returns {Object} { erfolg: boolean, fehler?: string }
 */
async function sendeEinladungsmail(empfaengerEmail, empfaengerName, einladungsToken) {
  const transporter = erstelleTransporter();
  if (!transporter) {
    return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };
  }

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const einladungsLink = `${appUrl}/#einladung/${einladungsToken}`;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Du wurdest zu yRelay eingeladen',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zu yRelay</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(99,102,241,0.3);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1));">
              <h1 style="margin:0;font-size:32px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px;">yRelay</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Messaging-Portal für Poke</p>
            </td>
          </tr>
          <!-- Inhalt -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:600;">Willkommen, ${empfaengerName}!</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Du wurdest eingeladen, yRelay zu nutzen - ein sicheres Portal, über das du Nachrichten direkt an den Poke KI-Assistenten senden kannst.
              </p>
              <p style="margin:0 0 32px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Klicke auf den Button unten, um dein Konto zu aktivieren und ein Passwort festzulegen. Der Link ist <strong style="color:#6366f1;">48 Stunden</strong> gültig.
              </p>
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${einladungsLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.5px;">Konto aktivieren →</a>
              </div>
              <div style="border-top:1px solid rgba(99,102,241,0.2);padding-top:24px;">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                  <a href="${einladungsLink}" style="color:#6366f1;word-break:break-all;">${einladungsLink}</a>
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;background:rgba(0,0,0,0.2);">
              <p style="margin:0;color:#475569;font-size:12px;">Diese E-Mail wurde von yRelay automatisch gesendet. Falls du keine Einladung erwartest, ignoriere diese Mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
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
 * @returns {Object} { erfolg: boolean, fehler?: string }
 */
async function testeSMTP() {
  const transporter = erstelleTransporter();
  if (!transporter) {
    return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };
  }
  try {
    await transporter.verify();
    return { erfolg: true };
  } catch (err) {
    return { erfolg: false, fehler: err.message };
  }
}

/**
 * Sendet eine Benachrichtigung, wenn Poke geantwortet hat.
 * @param {string} empfaengerEmail - E-Mail des Nutzers
 * @param {string} empfaengerName - Name des Nutzers
 * @param {string} originalNachricht - Der ursprüngliche Text
 * @param {string} antwortText - Pokes Antwort
 */
async function sendeAntwortMail(empfaengerEmail, empfaengerName, originalNachricht, antwortText) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Poke hat auf deine Nachricht geantwortet 🤖',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Poke hat geantwortet</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(99,102,241,0.3);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,rgba(6,182,212,0.2),rgba(56,189,248,0.1));">
              <h1 style="margin:0;font-size:28px;font-weight:800;background:linear-gradient(135deg,#06b6d4,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;">Neue Antwort</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Poke hat auf deine Nachricht geantwortet</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;font-weight:600;">Hallo ${empfaengerName},</h2>
              
              <div style="margin:24px 0;padding:20px;background:rgba(6,182,212,0.1);border-left:4px solid #06b6d4;border-radius:6px;">
                <p style="margin:0 0 8px;font-weight:700;color:#22d3ee;font-size:13px;text-transform:uppercase;">🤖 Pokes Antwort:</p>
                <p style="margin:0;color:#f8fafc;font-size:15px;line-height:1.6;white-space:pre-wrap;">${antwortText}</p>
              </div>

              <div style="margin:24px 0;padding:16px;background:rgba(148,163,184,0.05);border-left:4px solid #64748b;border-radius:6px;">
                <p style="margin:0 0 8px;font-weight:600;color:#94a3b8;font-size:12px;text-transform:uppercase;">Deine ursprüngliche Nachricht:</p>
                <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.5;white-space:pre-wrap;">${originalNachricht}</p>
              </div>

              <div style="text-align:center;margin-top:32px;">
                <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:rgba(255,255,255,0.1);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">Zum Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;text-align:center;background:rgba(0,0,0,0.2);">
              <p style="margin:0;color:#475569;font-size:12px;">Diese Benachrichtigung wurde automatisch von yRelay gesendet.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
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
 * Sendet einen Passwort-Zurücksetzen-Link.
 */
async function sendePasswortResetMail(empfaengerEmail, empfaengerName, resetToken) {
  const transporter = erstelleTransporter();
  if (!transporter) return { erfolg: false, fehler: 'SMTP ist nicht konfiguriert.' };

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const resetLink = `${appUrl}/#reset/${resetToken}`;

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Passwort zurücksetzen 🔑',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hallo ${empfaengerName},</h2>
        <p>Jemand hat angefragt, dein yRelay-Passwort zurückzusetzen. Falls du das warst, klicke auf den Button:</p>
        <a href="${resetLink}" style="display:inline-block; padding:12px 24px; background:#6366f1; color:#fff; text-decoration:none; border-radius:6px; margin: 20px 0;">Neues Passwort vergeben</a>
        <p>Dieser Link ist für <strong>1 Stunde</strong> gültig.</p>
        <p style="font-size: 12px; color: #666; margin-top: 40px;">Falls du das nicht warst, kannst du diese E-Mail einfach ignorieren.</p>
      </div>
    `
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

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto wurde gesperrt 🔒',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hallo ${empfaengerName},</h2>
        <p>Dein Konto bei yRelay wurde soeben von einem Administrator gesperrt.</p>
        <p>Du kannst dich aktuell nicht mehr einloggen und keine Nachrichten senden.</p>
        <p style="font-size: 12px; color: #666; margin-top: 40px;">Bitte wende dich an den Administrator, falls du Fragen hast.</p>
      </div>
    `
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

  const mailOptionen = {
    from: `"yRelay" <${absender}>`,
    to: empfaengerEmail,
    subject: 'Dein yRelay-Konto ist wieder aktiv! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hallo ${empfaengerName},</h2>
        <p>Dein Konto bei yRelay wurde soeben von einem Administrator wieder entsperrt.</p>
        <p>Du kannst dich nun wieder wie gewohnt einloggen:</p>
        <a href="${appUrl}" style="display:inline-block; padding:12px 24px; background:#10b981; color:#fff; text-decoration:none; border-radius:6px; margin: 20px 0;">Zum Login</a>
      </div>
    `
  };

  transporter.sendMail(mailOptionen).catch(() => {});
  return { erfolg: true };
}

module.exports = { sendeEinladungsmail, testeSMTP, sendeAntwortMail, sendePasswortResetMail, sendeKontoGesperrtMail, sendeKontoAktiviertMail };
