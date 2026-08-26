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

module.exports = { sendeEinladungsmail, testeSMTP };
