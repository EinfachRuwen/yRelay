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

// Audio-Upload separat vor express.json() registrieren,
// damit der Binär-Body nicht von express.json() verworfen wird
const { requireAuth } = require('./middleware/auth');
const { getSetting } = require('./db');

app.post('/api/nachrichten/transkribieren', requireAuth, express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ fehler: 'Keine gültigen Audiodaten empfangen.' });
  }

  const apiKey = getSetting('deepgram_api_key');
  if (!apiKey) {
    return res.status(500).json({ fehler: 'Deepgram API-Key ist nicht konfiguriert.' });
  }

  try {
    const contentType = req.headers['content-type'] || 'audio/webm';
    const response = await fetch('https://api.deepgram.com/v1/listen?punctuate=true&smart_format=true&language=de&model=whisper', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: req.body
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.err_msg || 'Deepgram API Fehler');
    }

    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
    res.json({ transkript: transcript });
  } catch (error) {
    console.error('[Deepgram Error]', error);
    res.status(502).json({ fehler: 'Transkription fehlgeschlagen: ' + error.message });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Statische Dateien (Frontend)
// index: false, damit wir index.html unten manuell mit Cache-Buster ausliefern können
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

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

// ─── SPA-Fallback & Cache-Busting ────────────────────────────────────────────
// Alle anderen Anfragen an index.html weiterleiten (für Client-seitiges Routing)
const START_TIME = Date.now();
const fs = require('fs');
let indexHtmlCache = null;

app.get('*', (req, res, next) => {
  // Für API-Routen Fehler werfen (404), statt HTML zu senden
  if (req.path.startsWith('/api/')) return next();

  if (!indexHtmlCache) {
    const indexPath = path.join(__dirname, '../public/index.html');
    try {
      let html = fs.readFileSync(indexPath, 'utf-8');
      // Cache-Buster an alle lokalen .js und .css Dateien anhängen
      html = html.replace(/src="([^"]+\.js)"/g, `src="$1?v=${START_TIME}"`);
      html = html.replace(/href="([^"]+\.css)"/g, `href="$1?v=${START_TIME}"`);
      indexHtmlCache = html;
    } catch (err) {
      console.error('[yRelay] Fehler beim Lesen von index.html', err);
      return res.status(500).send('Interner Serverfehler.');
    }
  }
  
  res.send(indexHtmlCache);
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

// Sicherheitswarnung wenn Standard-JWT-Secret verwendet wird
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'yrelay-geheimnis-bitte-aendern') {
  console.warn('\n⚠️  [yRelay] SICHERHEITSWARNUNG: JWT_SECRET ist nicht gesetzt oder verwendet den Standard-Wert!');
  console.warn('⚠️  [yRelay] Bitte setze JWT_SECRET auf einen langen, zufälligen String in der docker-compose.yml!\n');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[yRelay] Server läuft auf Port ${PORT}`);
  console.log(`[yRelay] Dashboard: http://localhost:${PORT}`);
});
