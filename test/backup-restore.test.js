const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-restore-test-'));
const dbPath = path.join(tempDir, 'yrelay.db');
process.env.DB_PATH = dbPath;
const { db } = require('../src/db');
const { backupDatabase, restoreBackup } = require('../src/services/backup');

test('Restore verändert die Live-DB nicht und wird beim Neustart aus Backup aktiviert', async () => {
  db.prepare(`INSERT INTO users (username, email) VALUES ('restore-user', 'restore@example.test')`).run();
  const fixturePath = await backupDatabase('fixture');
  const fixtureName = path.basename(fixturePath);
  db.prepare(`UPDATE users SET display_name = 'aktueller Stand' WHERE username = 'restore-user'`).run();

  await restoreBackup(fixtureName);
  assert.equal(db.prepare('SELECT display_name FROM users WHERE username = ?').get('restore-user').display_name, 'aktueller Stand');
  db.close();

  const restarted = spawnSync(process.execPath, ['-e', "require('./src/db').db.close()"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8',
  });
  assert.equal(restarted.status, 0, restarted.stderr || restarted.stdout);

  const restoredDb = new Database(dbPath, { readonly: true });
  assert.equal(restoredDb.prepare('SELECT display_name FROM users WHERE username = ?').get('restore-user').display_name, null);
  assert.deepEqual(restoredDb.pragma('foreign_key_check'), []);
  assert.equal(restoredDb.pragma('integrity_check')[0].integrity_check, 'ok');
  restoredDb.close();
  assert.equal(fs.existsSync(path.join(tempDir, 'backups', 'restore-pending.json')), false);
});

test.after(() => {
  try { db.close(); } catch {}
  fs.rmSync(tempDir, { recursive: true, force: true });
});