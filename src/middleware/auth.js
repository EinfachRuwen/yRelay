// JWT-Authentifizierungs-Middleware für yRelay
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'yrelay-geheimnis-bitte-aendern';

// Token aus dem Authorization-Header extrahieren und verifizieren
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ fehler: 'Nicht authentifiziert. Bitte einloggen.' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Nutzer aus der Datenbank laden (aktueller Status)
    const user = db.prepare('SELECT id, username, email, display_name, role, is_active, has_seen_onboarding, ntfy_topic FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ fehler: 'Konto ist deaktiviert oder nicht gefunden.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ fehler: 'Ungültiger oder abgelaufener Token.' });
  }
}

// Nur für Admins
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ fehler: 'Zugriff verweigert. Nur für Administratoren.' });
    }
    next();
  });
}

// JWT-Token erstellen
function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, requireAdmin, createToken };
