// Authentifizierungs-Routes für yRelay
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { createToken } = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - Anmeldung
router.post('/login', (req, res) => {
  const { benutzername, passwort } = req.body;

  if (!benutzername || !passwort) {
    return res.status(400).json({ fehler: 'Benutzername und Passwort sind erforderlich.' });
  }

  // Suche nach Benutzername oder E-Mail
  const user = db.prepare(`
    SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1
  `).get(benutzername, benutzername);

  if (!user || !user.password_hash) {
    return res.status(401).json({ fehler: 'Ungültige Anmeldedaten.' });
  }

  const passwortKorrekt = bcrypt.compareSync(passwort, user.password_hash);
  if (!passwortKorrekt) {
    return res.status(401).json({ fehler: 'Ungültige Anmeldedaten.' });
  }

  // Letzten Login aktualisieren
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const token = createToken(user.id);
  res.json({
    token,
    nutzer: {
      id: user.id,
      benutzername: user.username,
      email: user.email,
      rolle: user.role,
    },
  });
});

// POST /api/auth/einladung-annehmen - Einladung annehmen und Passwort setzen
router.post('/einladung-annehmen', (req, res) => {
  const { token, passwort } = req.body;

  if (!token || !passwort) {
    return res.status(400).json({ fehler: 'Token und Passwort sind erforderlich.' });
  }

  if (passwort.length < 8) {
    return res.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE invite_token = ? AND is_active = 1
  `).get(token);

  if (!user) {
    return res.status(400).json({ fehler: 'Ungültiger oder bereits verwendeter Einladungstoken.' });
  }

  // Ablaufdatum prüfen
  if (user.invite_expires_at && new Date(user.invite_expires_at) < new Date()) {
    return res.status(400).json({ fehler: 'Der Einladungslink ist abgelaufen. Bitte einen Administrator kontaktieren.' });
  }

  const passwortHash = bcrypt.hashSync(passwort, 12);
  db.prepare(`
    UPDATE users SET password_hash = ?, invite_token = NULL, invite_expires_at = NULL
    WHERE id = ?
  `).run(passwortHash, user.id);

  const authToken = createToken(user.id);
  res.json({
    nachricht: 'Konto erfolgreich aktiviert. Willkommen bei yRelay!',
    token: authToken,
    nutzer: {
      id: user.id,
      benutzername: user.username,
      email: user.email,
      rolle: user.role,
    },
  });
});

// GET /api/auth/ich - Eigenes Profil abrufen
router.get('/ich', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    benutzername: req.user.username,
    email: req.user.email,
    rolle: req.user.role,
  });
});

// POST /api/auth/passwort-aendern - Passwort ändern
router.post('/passwort-aendern', requireAuth, (req, res) => {
  const { altesPasswort, neuesPasswort } = req.body;

  if (!altesPasswort || !neuesPasswort) {
    return res.status(400).json({ fehler: 'Altes und neues Passwort sind erforderlich.' });
  }

  if (neuesPasswort.length < 8) {
    return res.status(400).json({ fehler: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const korrekt = bcrypt.compareSync(altesPasswort, user.password_hash);

  if (!korrekt) {
    return res.status(401).json({ fehler: 'Das alte Passwort ist falsch.' });
  }

  const neuerHash = bcrypt.hashSync(neuesPasswort, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(neuerHash, req.user.id);

  res.json({ nachricht: 'Passwort erfolgreich geändert.' });
});

// POST /api/auth/passwort-vergessen - Reset-E-Mail anfordern
router.post('/passwort-vergessen', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ fehler: 'E-Mail ist erforderlich.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Generische Antwort aus Sicherheitsgründen
    return res.json({ nachricht: 'Falls diese E-Mail existiert, wurde ein Reset-Link gesendet.' });
  }

  const { v4: uuidv4 } = require('uuid');
  const resetToken = uuidv4();
  const ablaufDatum = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1 Stunde

  db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(resetToken, ablaufDatum, user.id);

  const { sendePasswortResetMail } = require('../services/email');
  await sendePasswortResetMail(user.email, user.username, resetToken);

  res.json({ nachricht: 'Falls diese E-Mail existiert, wurde ein Reset-Link gesendet.' });
});

// POST /api/auth/passwort-zuruecksetzen - Neues Passwort setzen
router.post('/passwort-zuruecksetzen', (req, res) => {
  const { token, passwort } = req.body;

  if (!token || !passwort) {
    return res.status(400).json({ fehler: 'Token und Passwort sind erforderlich.' });
  }

  if (passwort.length < 8) {
    return res.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ fehler: 'Dieser Link ist ungültig oder wurde bereits verwendet.' });
  }

  if (new Date() > new Date(user.reset_expires_at)) {
    return res.status(400).json({ fehler: 'Dieser Link ist abgelaufen. Bitte fordere einen neuen an.' });
  }

  const hash = bcrypt.hashSync(passwort, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?').run(hash, user.id);

  res.json({ nachricht: 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt einloggen.' });
});

module.exports = router;
