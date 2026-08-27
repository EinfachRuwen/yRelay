// Admin-Routes für yRelay
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, getSetting, setSetting } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { sendeEinladungsmail, testeSMTP } = require('../services/email');

const router = express.Router();

// Alle Routes erfordern Admin-Zugriff
router.use(requireAdmin);

// ─── Nutzer-Verwaltung ──────────────────────────────────────────────────────

// GET /api/admin/nutzer - Alle Nutzer auflisten
router.get('/nutzer', (req, res) => {
  const nutzer = db.prepare(`
    SELECT id, username, email, role, is_active, invite_token,
           created_at, last_login
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json(nutzer.map(n => ({
    id: n.id,
    benutzername: n.username,
    email: n.email,
    rolle: n.role,
    aktiv: !!n.is_active,
    hatEinladungAusstehend: !!n.invite_token && !n.last_login,
    erstelltAm: n.created_at,
    letzterLogin: n.last_login,
  })));
});

// POST /api/admin/nutzer - Nutzer manuell anlegen
router.post('/nutzer', (req, res) => {
  const { benutzername, email, passwort } = req.body;

  if (!benutzername || !email || !passwort) {
    return res.status(400).json({ fehler: 'Benutzername, E-Mail und Passwort sind erforderlich.' });
  }

  if (passwort.length < 8) {
    return res.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const vorhanden = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(benutzername, email);
  if (vorhanden) {
    return res.status(409).json({ fehler: 'Benutzername oder E-Mail bereits vergeben.' });
  }

  const hash = bcrypt.hashSync(passwort, 12);
  const ergebnis = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, is_active)
    VALUES (?, ?, ?, 'user', 1)
  `).run(benutzername, email, hash);

  res.status(201).json({
    nachricht: `Nutzer "${benutzername}" erfolgreich erstellt.`,
    id: ergebnis.lastInsertRowid,
  });
});

// POST /api/admin/nutzer/einladen - Nutzer per E-Mail einladen
router.post('/nutzer/einladen', async (req, res) => {
  const { benutzername, email } = req.body;

  if (!benutzername || !email) {
    return res.status(400).json({ fehler: 'Benutzername und E-Mail sind erforderlich.' });
  }

  const vorhanden = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(benutzername, email);
  if (vorhanden) {
    return res.status(409).json({ fehler: 'Benutzername oder E-Mail bereits vergeben.' });
  }

  const einladungsToken = uuidv4();
  const ablaufDatum = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const ergebnis = db.prepare(`
    INSERT INTO users (username, email, role, is_active, invite_token, invite_expires_at)
    VALUES (?, ?, 'user', 1, ?, ?)
  `).run(benutzername, email, einladungsToken, ablaufDatum);

  // Einladungsmail versenden
  const mailErgebnis = await sendeEinladungsmail(email, benutzername, einladungsToken);

  if (!mailErgebnis.erfolg) {
    // Nutzer trotzdem angelegt, aber Mail fehlgeschlagen
    return res.status(201).json({
      nachricht: `Nutzer "${benutzername}" angelegt, aber E-Mail konnte nicht gesendet werden: ${mailErgebnis.fehler}`,
      id: ergebnis.lastInsertRowid,
      einladungsToken, // Token zurückgeben damit der Admin es manuell teilen kann
      mailFehler: true,
    });
  }

  res.status(201).json({
    nachricht: `Einladung an "${email}" erfolgreich gesendet.`,
    id: ergebnis.lastInsertRowid,
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

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(aktiv ? 1 : 0, id);

  const { sendeKontoGesperrtMail, sendeKontoAktiviertMail } = require('../services/email');
  if (aktiv) {
    sendeKontoAktiviertMail(user.email, user.username).catch(() => {});
  } else {
    sendeKontoGesperrtMail(user.email, user.username).catch(() => {});
  }

  res.json({ nachricht: `Nutzer ${aktiv ? 'aktiviert' : 'deaktiviert'}.` });
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

  const mailErgebnis = await sendeEinladungsmail(user.email, user.username, neuerToken);

  if (!mailErgebnis.erfolg) {
    return res.json({
      nachricht: 'Einladungslink neu generiert, aber E-Mail konnte nicht gesendet werden.',
      einladungsToken: neuerToken,
      mailFehler: true,
    });
  }

  res.json({ nachricht: 'Einladungslink neu generiert und per E-Mail gesendet.' });
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

// GET /api/admin/statistiken - Übersichts-Statistiken
router.get('/statistiken', (req, res) => {
  const gesamtNutzer = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
  const aktiveNutzer = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1').get('user').count;
  const gesamtNachrichten = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const heuteNachrichten = db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE date(created_at) = date('now')
  `).get().count;
  const webhookKonfiguriert = !!(getSetting('poke_webhook_url') && getSetting('poke_api_key'));

  res.json({
    gesamtNutzer,
    aktiveNutzer,
    gesamtNachrichten,
    heuteNachrichten,
    webhookKonfiguriert,
  });
});

module.exports = router;
