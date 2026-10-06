const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-corrupt-restore-'));
const dbPath = path.join(tempDir, 'yrelay.db');
process.env.DB_PATH = dbPath;
const { db } = require('../src/db');
const { backupDatabase } = require('../src/services/backup');

test('Beschädigtes Restore-Staging lässt die bisherige Datenbank unverändert', async () => {
  db.prepare(`INSERT INTO users (username, email) VALUES ('safe-user', 'safe@example.test')`).run();
  const rollbackPath = await backupDatabase('pre_restore');
  const backupDir = path.join(tempDir, 'backups');
  const stagingFile = 'restore-stage-corrupt.sqlite';
  fs.writeFileSync(path.join(backupDir, stagingFile), 'not a sqlite database');
  fs.writeFileSync(path.join(backupDir, 'restore-pending.json'), JSON.stringify({
    sourceFile: 'damaged.db',
    stagingFile,
    rollbackFile: path.basename(rollbackPath),
  }));
  db.close();

  const restarted = spawnSync(process.execPath, ['-e', "require('./src/db').db.close()"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8',
  });
  assert.equal(restarted.status, 0, restarted.stderr || restarted.stdout);

  const unchangedDb = new Database(dbPath, { readonly: true });
  assert.equal(unchangedDb.prepare('SELECT username FROM users WHERE email = ?').get('safe@example.test').username, 'safe-user');
  assert.equal(unchangedDb.pragma('integrity_check')[0].integrity_check, 'ok');
  unchangedDb.close();
  assert.equal(fs.existsSync(path.join(backupDir, 'restore-pending.json')), false);
  assert.ok(fs.readdirSync(backupDir).some(name => name.startsWith('restore-pending.json.failed-')));
});

test.after(() => {
  try { db.close(); } catch {}
  fs.rmSync(tempDir, { recursive: true, force: true });
});