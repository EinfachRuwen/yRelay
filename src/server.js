// yRelay - Haupt-Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initAdminUser, initSettings } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Statische Dateien (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// ─── API-Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/nachrichten', require('./routes/messages'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Gesundheitscheck
app.get('/api/gesundheit', (req, res) => {
  res.json({
    status: 'ok',
    dienst: 'yRelay',
    version: '1.0.0',
    zeitstempel: new Date().toISOString(),
  });
});

// ─── SPA-Fallback ────────────────────────────────────────────────────────────
// Alle anderen Anfragen an index.html weiterleiten (für Client-seitiges Routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Fehlerbehandlung ─────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('[yRelay] Serverfehler:', err);
  res.status(500).json({ fehler: 'Interner Serverfehler.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

// Datenbank initialisieren
console.log('[yRelay] Datenbank wird initialisiert...');
initSettings();
initAdminUser();
console.log('[yRelay] Datenbank bereit.');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[yRelay] Server läuft auf Port ${PORT}`);
  console.log(`[yRelay] Dashboard: http://localhost:${PORT}`);
});
