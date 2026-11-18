const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-rechtstexte-'));
process.env.DB_PATH = path.join(tempDir, 'yrelay.db');
process.env.JWT_SECRET = 'test-geheimnis-rechtstexte';

const express = require('express');
const { db } = require('../src/db');
const { createToken } = require('../src/middleware/auth');
const rechtstexteRoutes = require('../src/routes/rechtstexte');
const { markdownZuHtml } = require('../src/services/rechtstexte');

const app = express();
app.use(express.json());
app.use('/api/admin/rechtstexte', rechtstexteRoutes.admin);
app.use('/api/rechtstexte', rechtstexteRoutes.oeffentlich);

let server;
let basis;
let adminToken;
let nutzerToken;

test.before(async () => {
  const admin = db.prepare("INSERT INTO users (username, role) VALUES ('rt-admin', 'admin')").run();
  const nutzer = db.prepare("INSERT INTO users (username, role) VALUES ('rt-nutzer', 'user')").run();
  adminToken = createToken(admin.lastInsertRowid);
  nutzerToken = createToken(nutzer.lastInsertRowid);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  basis = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server?.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const anfrage = async (methode, pfad, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(basis + pfad, { method: methode, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
};

test('Ohne Eintrag ist nichts öffentlich hinterlegt', async () => {
  const uebersicht = await anfrage('GET', '/api/rechtstexte');
  assert.equal(uebersicht.status, 200);
  assert.deepEqual(uebersicht.json, {});
  const einzeln = await anfrage('GET', '/api/rechtstexte/datenschutz');
  assert.equal(einzeln.status, 404);
  assert.equal((await anfrage('GET', '/api/rechtstexte/unbekannt')).status, 404);
});

test('Admin-Endpunkte verlangen Anmeldung und Admin-Rolle', async () => {
  const body = { datenschutz: { modus: 'url', url: 'https://example.org/datenschutz' } };
  assert.equal((await anfrage('GET', '/api/admin/rechtstexte')).status, 401);
  assert.equal((await anfrage('PUT', '/api/admin/rechtstexte', { body })).status, 401);
  assert.equal((await anfrage('PUT', '/api/admin/rechtstexte', { body, token: 'kaputt' })).status, 401);
  assert.equal((await anfrage('GET', '/api/admin/rechtstexte', { token: nutzerToken })).status, 403);
  assert.equal((await anfrage('PUT', '/api/admin/rechtstexte', { body, token: nutzerToken })).status, 403);
  // Nichts wurde gespeichert
  assert.deepEqual((await anfrage('GET', '/api/rechtstexte')).json, {});
});

test('Externer Link und eigener Text werden gespeichert und öffentlich angezeigt', async () => {
  const gespeichert = await anfrage('PUT', '/api/admin/rechtstexte', {
    token: adminToken,
    body: {
      datenschutz: { modus: 'url', url: 'https://example.org/datenschutz' },
      impressum: { modus: 'text', text: '# Impressum\n\nBetreiberin: Beispiel GmbH' },
    },
  });
  assert.equal(gespeichert.status, 200);

  const uebersicht = (await anfrage('GET', '/api/rechtstexte')).json;
  assert.deepEqual(uebersicht.datenschutz, { titel: 'Datenschutz', modus: 'url', url: 'https://example.org/datenschutz' });
  assert.deepEqual(uebersicht.impressum, { titel: 'Impressum', modus: 'text' });

  const impressum = (await anfrage('GET', '/api/rechtstexte/impressum')).json;
  assert.equal(impressum.modus, 'text');
  assert.match(impressum.html, /<h2>Impressum<\/h2>/);
  assert.match(impressum.html, /<p>Betreiberin: Beispiel GmbH<\/p>/);

  const adminSicht = (await anfrage('GET', '/api/admin/rechtstexte', { token: adminToken })).json;
  assert.equal(adminSicht.impressum.text, '# Impressum\n\nBetreiberin: Beispiel GmbH');

  // Zurücksetzen: Links verschwinden wieder
  const zurueck = await anfrage('PUT', '/api/admin/rechtstexte', {
    token: adminToken,
    body: { datenschutz: { modus: 'keine' }, impressum: { modus: 'keine' } },
  });
  assert.equal(zurueck.status, 200);
  assert.deepEqual((await anfrage('GET', '/api/rechtstexte')).json, {});
});

test('Ungültige Eingaben werden abgelehnt und nichts halb gespeichert', async () => {
  const faelle = [
    { datenschutz: { modus: 'url', url: 'javascript:alert(1)' } },
    { datenschutz: { modus: 'url', url: 'data:text/html,<script>alert(1)</script>' } },
    { datenschutz: { modus: 'url', url: '' } },
    { datenschutz: { modus: 'text', text: '   ' } },
    { datenschutz: { modus: 'html', text: 'x' } },
    { agb: { modus: 'text', text: 'x' } },
    { impressum: { modus: 'text', text: 'ok' }, datenschutz: { modus: 'url', url: 'ftp://example.org' } },
  ];
  for (const body of faelle) {
    const res = await anfrage('PUT', '/api/admin/rechtstexte', { token: adminToken, body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.deepEqual((await anfrage('GET', '/api/rechtstexte')).json, {});
});

test('Eigener Text wird XSS-sicher gerendert', async () => {
  const boese = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '[klick](javascript:alert(1))',
    '[klick](JaVaScRiPt:alert(1))',
    '[daten](data:text/html;base64,PHNjcmlwdD4=)',
    '[zitat](https://example.org/"onmouseover="alert(1))',
    '**<b onclick=alert(1)>fett</b>**',
    '<a href="javascript:alert(1)">x</a>',
    '# <svg onload=alert(1)>',
  ].join('\n\n');
  const res = await anfrage('PUT', '/api/admin/rechtstexte', {
    token: adminToken,
    body: { datenschutz: { modus: 'text', text: boese } },
  });
  assert.equal(res.status, 200);
  const { html } = (await anfrage('GET', '/api/rechtstexte/datenschutz')).json;

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /<svg/i);
  assert.doesNotMatch(html, /<b[\s>]/i);
  assert.doesNotMatch(html, /href="(?:javascript|data):/i);
  assert.doesNotMatch(html, /<[^>]*\son\w+=/i, 'keine Event-Handler als Attribut');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  // Jeder erzeugte Tag ist aus der erlaubten Liste
  for (const [, tag] of html.matchAll(/<\/?([a-z0-9]+)/gi)) {
    assert.ok(['h2', 'h3', 'h4', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'hr', 'a'].includes(tag.toLowerCase()), tag);
  }
  // Jedes href ist http(s), mailto: oder tel:
  for (const [, ziel] of html.matchAll(/href="([^"]*)"/g)) {
    assert.match(ziel, /^(https?:|mailto:|tel:)/);
  }
});

test('Markdown: Links, Listen und Formatierung', () => {
  const html = markdownZuHtml('## Kontakt\n\n- [Mail](mailto:info@example.org)\n- [Web](https://example.org)\n\n**fett** und *kursiv*\nzweite Zeile');
  assert.match(html, /<h3>Kontakt<\/h3>/);
  assert.match(html, /<ul><li><a href="mailto:info@example.org">Mail<\/a><\/li><li><a href="https:\/\/example.org\/" target="_blank" rel="noopener noreferrer">Web<\/a><\/li><\/ul>/);
  assert.match(html, /<p><strong>fett<\/strong> und <em>kursiv<\/em><br>zweite Zeile<\/p>/);
});
