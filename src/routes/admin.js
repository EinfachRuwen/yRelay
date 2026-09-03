const { isValidNtfyTopic, NTFY_TOPIC_MAX_LENGTH } = require('../services/ntfy');
// Admin-Routes für yRelay
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, getSetting, setSetting, logAudit } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { sendeEinladungsmail, testeSMTP } = require('../services/email');

const router = express.Router();

// Alle Routes erfordern Admin-Zugriff
router.use(requireAdmin);

// ─── Nutzer-Verwaltung ──────────────────────────────────────────────────────

// GET /api/admin/nutzer - Alle Nutzer auflisten
router.get('/nutzer', (req, res) => {
  const nutzer = db.prepare(`
    SELECT u.id, u.username, u.email, u.display_name, u.role, u.is_active, u.invite_token,
           u.created_at, u.last_login, u.ntfy_topic, u.email_notifications,
           u.has_schul_access, u.schul_poke_profile_id,
           (SELECT group_concat(label_id) FROM nutzer_labels WHERE nutzer_id = u.id) as label_ids
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  res.json(nutzer.map(n => ({
    id: n.id,
    benutzername: n.username,
    anzeigename: n.display_name,
    email: n.email,
    rolle: n.role,
    aktiv: !!n.is_active,
    hatEinladungAusstehend: !!n.invite_token && !n.last_login,
    erstelltAm: n.created_at,
    letzterLogin: n.last_login,
    ntfy_topic: n.ntfy_topic || null,
    email_notifications: !!n.email_notifications,
    has_schul_access: !!n.has_schul_access,
    schul_poke_profile_id: n.schul_poke_profile_id,
    labelIds: n.label_ids ? n.label_ids.split(',').map(Number) : [],
  })));
});

// POST /api/admin/nutzer - Nutzer manuell anlegen
router.post('/nutzer', (req, res) => {
  const { benutzername, email, passwort, anzeigename } = req.body;

  if (!benutzername || !passwort) {
    return res.status(400).json({ fehler: 'Benutzername und Passwort sind erforderlich.' });
  }

  if (passwort.length < 8) {
    return res.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const emailVal = email && email.trim() !== '' ? email.trim() : null;

  const vorhanden = db.prepare('SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)').get(benutzername, emailVal);
  if (vorhanden) {
    return res.status(409).json({ fehler: 'Benutzername oder E-Mail bereits vergeben.' });
  }

  const hash = bcrypt.hashSync(passwort, 12);
  const ergebnis = db.prepare(`
    INSERT INTO users (username, email, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 'user', 1)
  `).run(benutzername, emailVal, anzeigename || null, hash);

  logAudit(req.user.id, 'admin_create_user', { target_user_id: ergebnis.lastInsertRowid, username: benutzername });

  res.status(201).json({
    nachricht: `Nutzer "${benutzername}" erfolgreich erstellt.`,
    id: ergebnis.lastInsertRowid,
  });
});

// POST /api/admin/nutzer/einladen - Nutzer per E-Mail/Link einladen
router.post('/nutzer/einladen', async (req, res) => {
  const { benutzername, email, anzeigename } = req.body;

  if (!benutzername) {
    return res.status(400).json({ fehler: 'Benutzername ist erforderlich.' });
  }

  const emailVal = email && email.trim() !== '' ? email.trim() : null;

  const vorhanden = db.prepare('SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)').get(benutzername, emailVal);
  if (vorhanden) {
    return res.status(409).json({ fehler: 'Benutzername oder E-Mail bereits vergeben.' });
  }

  const einladungsToken = uuidv4();
  const ablaufDatum = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const ergebnis = db.prepare(`
    INSERT INTO users (username, email, display_name, role, is_active, invite_token, invite_expires_at)
    VALUES (?, ?, ?, 'user', 1, ?, ?)
  `).run(benutzername, emailVal, anzeigename || null, einladungsToken, ablaufDatum);

  logAudit(req.user.id, 'admin_invite_user', { target_user_id: ergebnis.lastInsertRowid, username: benutzername, email: emailVal });

  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/#einladung/${einladungsToken}`;

  // Einladungsmail versenden (falls Mail vorhanden)
  let mailErgebnis = { erfolg: true };
  if (emailVal) {
    mailErgebnis = await sendeEinladungsmail(emailVal, benutzername, einladungsToken);
  }

  if (!mailErgebnis.erfolg) {
    // Nutzer trotzdem angelegt, aber Mail fehlgeschlagen
    return res.status(201).json({
      nachricht: `Nutzer "${benutzername}" angelegt, aber E-Mail konnte nicht gesendet werden: ${mailErgebnis.fehler}`,
      id: ergebnis.lastInsertRowid,
      einladungsToken,
      inviteUrl,
      mailFehler: true,
    });
  }

  res.status(201).json({
    nachricht: emailVal ? `Einladung an "${emailVal}" erfolgreich gesendet.` : `Nutzer "${benutzername}" erstellt. Einladungslink generiert.`,
    id: ergebnis.lastInsertRowid,
    inviteUrl,
  });
});

// PATCH /api/admin/nutzer/:id - Nutzer aktivieren/deaktivieren
router.patch('/nutzer/:id', async (req, res) => {
  const { id } = req.params;
  const { aktiv } = req.body;

  // Verhindere, dass der eigene Admin-Account deaktiviert wird
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ fehler: 'Du kannst deinen eigenen Account nicht deaktivieren.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });
  }

  const aktivVal = aktiv ? 1 : 0;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(aktivVal, id);

  logAudit(req.user.id, 'admin_toggle_status', { target_user_id: id, is_active: aktivVal });

  const { sendeKontoGesperrtMail, sendeKontoAktiviertMail } = require('../services/email');
  if (aktiv) {
    sendeKontoAktiviertMail(user.email, user.username).catch(() => {});
  } else {
    sendeKontoGesperrtMail(user.email, user.username).catch(() => {});
  }

  res.json({ nachricht: `Nutzer ${aktiv ? 'aktiviert' : 'deaktiviert'}.` });
});

// PUT /api/admin/nutzer/:id - Nutzer bearbeiten
router.put('/nutzer/:id', (req, res) => {
  const { id } = req.params;
  const { benutzername, email, anzeigename, ntfy_topic, email_notifications, has_schul_access, schul_poke_profile_id } = req.body;

  if (!benutzername) {
    return res.status(400).json({ fehler: 'Benutzername ist erforderlich.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });
  }

  const emailVal = email && email.trim() !== '' ? email.trim() : null;
  const ntfyVal = ntfy_topic && ntfy_topic.trim() !== '' ? ntfy_topic.trim() : null;
  const emailNotifVal = email_notifications ? 1 : 0;
  const schulAccessVal = has_schul_access ? 1 : 0;
  const schulPokeIdVal = schul_poke_profile_id ? parseInt(schul_poke_profile_id) : null;

  if (ntfyVal && !isValidNtfyTopic(ntfyVal)) {
    return res.status(400).json({ fehler: `Das ntfy Topic darf nur Buchstaben, Zahlen, - und _ enthalten und maximal ${NTFY_TOPIC_MAX_LENGTH} Zeichen lang sein.` });
  }

  const vorhanden = db.prepare('SELECT id FROM users WHERE (username = ? OR (email = ? AND email IS NOT NULL)) AND id != ?').get(benutzername, emailVal, id);
  if (vorhanden) {
    return res.status(409).json({ fehler: 'Benutzername oder E-Mail wird bereits von einem anderen Nutzer verwendet.' });
  }

  db.prepare(`
    UPDATE users SET username = ?, email = ?, display_name = ?, ntfy_topic = ?, email_notifications = ?, has_schul_access = ?, schul_poke_profile_id = ? WHERE id = ?
  `).run(benutzername, emailVal, anzeigename || null, ntfyVal, emailNotifVal, schulAccessVal, schulPokeIdVal, id);

  logAudit(req.user.id, 'admin_edit_user', { target_user_id: id, username: benutzername });

  res.json({ nachricht: 'Nutzerdaten erfolgreich aktualisiert.' });
});

// DELETE /api/admin/nutzer/:id - Nutzer löschen
router.delete('/nutzer/:id', (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ fehler: 'Du kannst deinen eigenen Account nicht löschen.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  logAudit(req.user.id, 'admin_delete_user', { target_user_id: id, username: user.username });
  
  res.json({ nachricht: 'Nutzer erfolgreich gelöscht.' });
});

// POST /api/admin/nutzer/:id/einladung-neu - Einladungslink neu generieren
router.post('/nutzer/:id/einladung-neu', async (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });
  }

  const neuerToken = uuidv4();
  const ablaufDatum = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE users SET invite_token = ?, invite_expires_at = ?, password_hash = NULL WHERE id = ?
  `).run(neuerToken, ablaufDatum, id);

  logAudit(req.user.id, 'admin_resend_invite', { target_user_id: id, username: user.username });

  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/#einladung/${neuerToken}`;

  let mailErgebnis = { erfolg: true };
  if (user.email) {
    mailErgebnis = await sendeEinladungsmail(user.email, user.username, neuerToken);
  }

  if (!mailErgebnis.erfolg) {
    return res.json({
      nachricht: 'Einladungslink neu generiert, aber E-Mail konnte nicht gesendet werden.',
      einladungsToken: neuerToken,
      inviteUrl,
      mailFehler: true,
    });
  }

  res.json({ 
    nachricht: user.email ? 'Einladungslink neu generiert und per E-Mail gesendet.' : 'Einladungslink neu generiert.',
    inviteUrl 
  });
});

// POST /api/admin/nutzer/:id/passwort-reset - Admin triggert Reset-Mail
router.post('/nutzer/:id/passwort-reset', async (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });
  }

  const { sendePasswortResetMail } = require('../services/email');
  const resetToken = uuidv4();
  const ablaufDatum = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();

  db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(resetToken, ablaufDatum, id);

  const mailErgebnis = await sendePasswortResetMail(user.email, user.username, resetToken);

  if (!mailErgebnis.erfolg) {
    return res.status(502).json({ fehler: `Fehler beim E-Mail-Versand: ${mailErgebnis.fehler}` });
  }

  res.json({ nachricht: 'Passwort-Reset-E-Mail erfolgreich gesendet.' });
});

// ─── Nachrichten-Übersicht ──────────────────────────────────────────────────

// GET /api/admin/nachrichten - Alle gesendeten Nachrichten
router.get('/nachrichten', (req, res) => {
  const fixTZ = (d) => d ? d.replace(' ', 'T') + 'Z' : null;
  const nachrichten = db.prepare(`
    SELECT m.id, m.type, m.priority, m.content, m.status, m.error_message,
           m.reply_content, m.replied_at, m.user_replies, m.created_at, u.username, u.email
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 500
  `).all();

  res.json(nachrichten.map(n => ({
    id: n.id,
    typ: n.type,
    prioritaet: n.priority,
    inhalt: n.content,
    status: n.status,
    fehler: n.error_message,
    antwortText: n.reply_content,
    nutzerAntworten: n.user_replies || null,
    antwortDatum: fixTZ(n.replied_at),
    gesendetAm: fixTZ(n.created_at),
    von: { benutzername: n.username, email: n.email },
  })));
});

// ─── Backups ────────────────────────────────────────────────────────────────
const { backupDatabase, listBackups, restoreBackup } = require('../services/backup');

// GET /api/admin/backups - Liste aller Backups
router.get('/backups', (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ fehler: 'Fehler beim Laden der Backups: ' + err.message });
  }
});

// POST /api/admin/backups - Manuelles Backup erstellen
router.post('/backups', async (req, res) => {
  try {
    await backupDatabase('manual');
    res.json({ nachricht: 'Backup erfolgreich erstellt.' });
  } catch (err) {
    res.status(500).json({ fehler: 'Fehler beim Erstellen des Backups: ' + err.message });
  }
});

// POST /api/admin/backups/:filename/restore - Backup wiederherstellen
router.post('/backups/:filename/restore', (req, res) => {
  const { filename } = req.params;
  try {
    restoreBackup(filename);
    res.json({ nachricht: 'Backup erfolgreich wiederhergestellt. Der Server muss möglicherweise neu gestartet werden.' });
    // Beende den Prozess kurz nach der Antwort, damit der Prozess-Manager (npm, docker etc.) ihn mit der alten DB neu startet.
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    res.status(500).json({ fehler: 'Fehler bei der Wiederherstellung: ' + err.message });
  }
});

// ─── Einstellungen ──────────────────────────────────────────────────────────

// GET /api/admin/einstellungen - Einstellungen abrufen
router.get('/einstellungen', (req, res) => {
  res.json({
    pokeWebhookUrl: getSetting('poke_webhook_url') || '',
    pokeApiKey: getSetting('poke_api_key') ? '••••••••' : '',
    pokeApiKeyGesetzt: !!(getSetting('poke_api_key')),
    smtpHost: getSetting('smtp_host') || '',
    smtpPort: getSetting('smtp_port') || '587',
    smtpUser: getSetting('smtp_user') || '',
    smtpPassGesetzt: !!(getSetting('smtp_pass')),
    smtpFrom: getSetting('smtp_from') || '',
    appUrl: getSetting('app_url') || '',
    schulDashboardEnabled: getSetting('schul_dashboard_enabled') === 'true',
  });
});

// PUT /api/admin/einstellungen - Einstellungen speichern
router.put('/einstellungen', (req, res) => {
  const {
    pokeWebhookUrl, pokeApiKey,
    smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
    appUrl,
  } = req.body;

  if (pokeWebhookUrl !== undefined) setSetting('poke_webhook_url', pokeWebhookUrl);
  if (pokeApiKey && pokeApiKey !== '••••••••') setSetting('poke_api_key', pokeApiKey);
  if (smtpHost !== undefined) setSetting('smtp_host', smtpHost);
  if (smtpPort !== undefined) setSetting('smtp_port', smtpPort);
  if (smtpUser !== undefined) setSetting('smtp_user', smtpUser);
  if (smtpPass && smtpPass !== '••••••••') setSetting('smtp_pass', smtpPass);
  if (smtpFrom !== undefined) setSetting('smtp_from', smtpFrom);
  if (appUrl !== undefined) setSetting('app_url', appUrl);
  if (req.body.schulDashboardEnabled !== undefined) setSetting('schul_dashboard_enabled', req.body.schulDashboardEnabled ? 'true' : 'false');

  logAudit(req.user.id, 'admin_settings_updated', {});

  res.json({ nachricht: 'Einstellungen erfolgreich gespeichert.' });
});

// POST /api/admin/einstellungen/smtp-test - SMTP-Verbindung testen
router.post('/einstellungen/smtp-test', async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = req.body;
  
  if (smtpHost) {
    const nodemailer = require('nodemailer');
    const port = parseInt(smtpPort || '587', 10);
    const pass = smtpPass === '••••••••' ? getSetting('smtp_pass') : smtpPass;
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: port === 465,
      auth: { user: smtpUser, pass: pass },
      tls: { rejectUnauthorized: false },
    });
    
    try {
      await transporter.verify();
      return res.json({ nachricht: 'SMTP-Verbindung erfolgreich.' });
    } catch (err) {
      return res.status(400).json({ fehler: err.message });
    }
  }

  const ergebnis = await testeSMTP();
  if (ergebnis.erfolg) {
    res.json({ nachricht: 'SMTP-Verbindung erfolgreich.' });
  } else {
    res.status(400).json({ fehler: ergebnis.fehler });
  }
});

// ─── Admin-Notiz ────────────────────────────────────────────────────────────

// GET /api/admin/notiz - Notiz abrufen
router.get('/notiz', (req, res) => {
  res.json({ text: getSetting('admin_notes') || '' });
});

// POST /api/admin/notiz - Notiz speichern
router.post('/notiz', (req, res) => {
  const { text } = req.body;
  setSetting('admin_notes', text || '');
  res.json({ nachricht: 'Notiz gespeichert.' });
});

// GET /api/admin/statistiken - Übersichts-Statistiken (erweitert)
router.get('/statistiken', (req, res) => {
  const gesamtNutzer = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
  const aktiveNutzer = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1').get('user').count;
  const gesamtNachrichten = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const heuteNachrichten = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE date(created_at) = date('now')`).get().count;
  const webhookKonfiguriert = !!(getSetting('poke_webhook_url') && getSetting('poke_api_key'));

  // Neue Statistiken für Charts
  // Nachrichten pro Tag (letzte 30 Tage)
  const nachrichtenProTag = db.prepare(`
    SELECT date(created_at) as tag, COUNT(*) as anzahl
    FROM messages
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY tag ASC
  `).all();

  // Nachrichten nach Typ
  const nachrichtenNachTyp = db.prepare(`
    SELECT type, COUNT(*) as anzahl FROM messages GROUP BY type
  `).all();

  // Antwortrate
  const beantwortet = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE reply_content IS NOT NULL`).get().count;
  const offen = gesamtNachrichten - beantwortet;

  // Top 5 aktivste Nutzer
  const topNutzer = db.prepare(`
    SELECT u.username, COUNT(m.id) as anzahl
    FROM messages m JOIN users u ON m.user_id = u.id
    GROUP BY m.user_id ORDER BY anzahl DESC LIMIT 5
  `).all();

  // Geplante Nachrichten
  const geplantNachrichten = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE status = 'geplant'`).get().count;

  // Gepinnte Nachrichten
  const gepinnteNachrichten = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE is_pinned = 1`).get().count;

  res.json({
    gesamtNutzer,
    aktiveNutzer,
    gesamtNachrichten,
    heuteNachrichten,
    webhookKonfiguriert,
    nachrichtenProTag,
    nachrichtenNachTyp,
    antwortrate: { beantwortet, offen },
    topNutzer,
    geplantNachrichten,
    gepinnteNachrichten,
  });
});

// ─── Broadcast-Mail ─────────────────────────────────────────────────────────

// POST /api/admin/broadcast - Broadcast-Mail an alle (oder gefilterte) Nutzer
router.post('/broadcast', async (req, res) => {
  const { betreff, nachricht, labelId } = req.body;
  if (!betreff || !nachricht) return res.status(400).json({ fehler: 'Betreff und Nachricht sind erforderlich.' });

  const { sendeAusstehendeAntwortMail } = require('../services/email');
  const nodemailer = require('nodemailer');

  // Empfänger ermitteln
  let nutzer;
  if (labelId) {
    nutzer = db.prepare(`
      SELECT u.username, u.email FROM users u
      JOIN nutzer_labels nl ON u.id = nl.nutzer_id
      WHERE nl.label_id = ? AND u.is_active = 1 AND u.role = 'user' AND u.email IS NOT NULL
    `).all(labelId);
  } else {
    nutzer = db.prepare(`SELECT username, email FROM users WHERE is_active = 1 AND role = 'user' AND email IS NOT NULL`).all();
  }

  if (nutzer.length === 0) return res.json({ nachricht: 'Keine Empfänger gefunden.', gesendet: 0 });

  // Asynchron senden (nicht blockierend)
  res.json({ nachricht: `Broadcast wird an ${nutzer.length} Nutzer gesendet.`, gesendet: nutzer.length });

  const absender = getSetting('smtp_from') || getSetting('smtp_user');
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const transporter = (() => {
    const host = getSetting('smtp_host');
    const port = parseInt(getSetting('smtp_port') || '587', 10);
    const user = getSetting('smtp_user');
    const pass = getSetting('smtp_pass');
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, tls: { rejectUnauthorized: false } });
  })();

  if (!transporter) return;


  const broadcastBody = `
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f1f5f9;">📢 ${betreff}</p>
    <div style="padding:20px;background:rgba(99,102,241,0.06);border-left:4px solid #6366f1;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.8;white-space:pre-wrap;">${nachricht}</p>
    </div>
    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Zum Dashboard →</a>
    </div>
  `;

  for (const nutzerItem of nutzer) {
    try {
      const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#080c14;font-family:'Segoe UI',system-ui,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#080c14,#0f172a);padding:40px 16px;">
      <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
      <tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">y</span><span style="font-size:26px;font-weight:900;color:#f1f5f9;">Relay</span></td></tr>
      <tr><td style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(99,102,241,0.25);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
      <tr><td style="padding:32px 36px 24px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08));border-bottom:1px solid rgba(99,102,241,0.12);">
      <div style="font-size:40px;margin-bottom:12px;">📢</div>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#f1f5f9;">${betreff}</h1>
      <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Nachricht vom yRelay-Admin</p></td></tr>
      <tr><td style="padding:32px 36px;">${broadcastBody}</td></tr>
      <tr><td style="padding:16px 36px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);"><p style="margin:0;color:#334155;font-size:11px;">Diese E-Mail wurde automatisch von yRelay gesendet.</p></td></tr>
      </td></tr></table></td></tr></table></body></html>`;
      await transporter.sendMail({
        from: `"yRelay" <${absender}>`,
        to: nutzerItem.email,
        subject: `📢 ${betreff}`,
        html,
      });
      await new Promise(r => setTimeout(r, 150)); // Anti-Spam Delay
    } catch (err) {
      console.error(`[yRelay Broadcast] Fehler bei ${nutzerItem.email}:`, err.message);
    }
  }

  logAudit(req.user.id, 'admin_broadcast', { count: nutzer.length, subject: betreff });
  console.log(`[yRelay] Broadcast an ${nutzer.length} Nutzer gesendet.`);
});

// ─── Labels ─────────────────────────────────────────────────────────────────

// GET /api/admin/labels - Alle Labels
router.get('/labels', (req, res) => {
  const labels = db.prepare('SELECT * FROM labels ORDER BY name ASC').all();
  const anzahl = db.prepare('SELECT label_id, COUNT(*) as count FROM nutzer_labels GROUP BY label_id').all();
  const map = {};
  anzahl.forEach(a => map[a.label_id] = a.count);
  res.json(labels.map(l => ({ ...l, nutzerAnzahl: map[l.id] || 0 })));
});

// POST /api/admin/labels - Label erstellen
router.post('/labels', (req, res) => {
  const { name, farbe } = req.body;
  if (!name) return res.status(400).json({ fehler: 'Name ist erforderlich.' });
  try {
    const result = db.prepare(`INSERT INTO labels (name, farbe) VALUES (?, ?)`).run(name.trim(), farbe || '#6366f1');
    logAudit(req.user.id, 'admin_create_label', { label_id: result.lastInsertRowid, name: name.trim() });
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), farbe: farbe || '#6366f1', nutzerAnzahl: 0 });
  } catch {
    res.status(409).json({ fehler: 'Label mit diesem Namen existiert bereits.' });
  }
});

// DELETE /api/admin/labels/:id - Label löschen
router.delete('/labels/:id', (req, res) => {
  const label = db.prepare('SELECT name FROM labels WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM labels WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'admin_delete_label', { label_id: req.params.id, name: label?.name });
  res.json({ nachricht: 'Label gelöscht.' });
});

// PUT /api/admin/nutzer/:id/labels - Labels eines Nutzers setzen
router.put('/nutzer/:id/labels', (req, res) => {
  const { labelIds } = req.body; // Array von label IDs
  if (!Array.isArray(labelIds)) return res.status(400).json({ fehler: 'labelIds muss ein Array sein.' });
  db.prepare('DELETE FROM nutzer_labels WHERE nutzer_id = ?').run(req.params.id);
  const insert = db.prepare('INSERT OR IGNORE INTO nutzer_labels (nutzer_id, label_id) VALUES (?, ?)');
  const transaction = db.transaction((ids) => { for (const lid of ids) insert.run(req.params.id, lid); });
  transaction(labelIds);
  logAudit(req.user.id, 'admin_update_user_labels', { target_user_id: req.params.id, label_ids: labelIds });
  res.json({ nachricht: 'Labels aktualisiert.' });
});

// GET /api/admin/nutzer/:id/labels - Labels eines Nutzers
router.get('/nutzer/:id/labels', (req, res) => {
  const labels = db.prepare(`
    SELECT l.* FROM labels l JOIN nutzer_labels nl ON l.id = nl.label_id WHERE nl.nutzer_id = ?
  `).all(req.params.id);
  res.json(labels);
});

// GET /api/admin/audit-logs - Audit Logs laden
router.get('/audit-logs', (req, res) => {
  const limit = 500;
  const logs = db.prepare(`
    SELECT a.id, a.action, a.details, a.created_at, u.username as user_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);

  res.json(logs);
});

module.exports = router;

