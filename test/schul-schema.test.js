const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-test-'));
process.env.DB_PATH = path.join(tempDir, 'yrelay.db');
const { db } = require('../src/db');
const webhookRouter = require('../src/routes/webhooks');

test('Schul-Integration und isolierte Cache-Spalten existieren', () => {
  const integrationColumns = db.prepare('PRAGMA table_info(schul_integrationen)').all().map(column => column.name);
  const cacheColumns = db.prepare('PRAGMA table_info(schul_kalender_cache)').all().map(column => column.name);
  const tileColumns = db.prepare('PRAGMA table_info(schul_kacheln)').all().map(column => column.name);

  assert.ok(integrationColumns.includes('token'));
  assert.ok(integrationColumns.includes('modus'));
  assert.ok(cacheColumns.includes('integration_id'));
  assert.ok(tileColumns.includes('formular'));
});

test('Webhook-Daten koennen einer Integration zugeordnet werden', () => {
  const user = db.prepare(`
    INSERT INTO users (username, role) VALUES (?, 'user')
  `).run('schema-test-user');
  const profile = db.prepare(`
    INSERT INTO poke_profiles (name, webhook_url, api_key, ist_standard)
    VALUES (?, ?, ?, 1)
  `).run('Test-Poke', 'https://example.test/hook', 'test-key');
  const integration = db.prepare(`
    INSERT INTO schul_integrationen (nutzer_id, profil_id, token)
    VALUES (?, ?, ?)
  `).run(user.lastInsertRowid, profile.lastInsertRowid, 'test-integration-token');

  db.prepare(`
    INSERT INTO schul_kalender_cache (integration_id, titel, start)
    VALUES (?, ?, ?)
  `).run(integration.lastInsertRowid, 'Testtermin', '2099-01-01T08:00:00+01:00');

  const row = db.prepare('SELECT titel FROM schul_kalender_cache WHERE integration_id = ?').get(integration.lastInsertRowid);
  assert.equal(row.titel, 'Testtermin');
});

test('Stundenplan akzeptiert Namen und alternative Feldnamen', () => {
  const normalisiert = webhookRouter.normalisiereStundenplan({ eintraege: [
    { wochentag: 'Montag', fachname: 'Mathe', lehrername: 'Frau Müller', startzeit: '8:00', endzeit: '08:45', raumname: '204' }
  ] });

  assert.deepEqual(normalisiert[0], {
    wochentag: 1,
    fach: 'Mathe',
    lehrer: 'Frau Müller',
    start: '8:00',
    ende: '08:45',
    raum: '204',
    notiz: null,
  });
});

test.after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
