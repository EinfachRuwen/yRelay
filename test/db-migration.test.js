const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const test = require('node:test');

test('E-Mail-Migration erhält Nutzerdaten, verknüpfte Nachrichten und erzeugt ein gültiges WAL-Backup', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-migration-test-'));
  const dbPath = path.join(tempDir, 'yrelay.db');
  const legacyDb = new Database(dbPath);
  legacyDb.pragma('journal_mode = WAL');
  legacyDb.pragma('foreign_keys = ON');
  legacyDb.exec(`
    CREATE TABLE poke_profiles (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT, farbe TEXT,
      webhook_url TEXT NOT NULL, api_key TEXT NOT NULL, beschreibung TEXT,
      ist_standard INTEGER DEFAULT 0, erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      invite_token TEXT,
      invite_expires_at DATETIME,
      reset_token TEXT,
      reset_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      has_seen_onboarding INTEGER NOT NULL DEFAULT 0,
      ntfy_topic TEXT,
      email_notifications INTEGER NOT NULL DEFAULT 0,
      pushover_user_key TEXT,
      has_schul_access INTEGER DEFAULT 0,
      schul_poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL,
      schul_wetter_ort TEXT,
      schul_haltestelle_name TEXT,
      schul_haltestelle_id TEXT,
      schul_haltestellen TEXT DEFAULT '[]',
      schul_nahe_haltestellen INTEGER DEFAULT 0
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'free', priority TEXT, content TEXT NOT NULL,
      poke_payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'gesendet',
      error_message TEXT, reply_token TEXT, reply_content TEXT,
      replied_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  legacyDb.prepare(`
    INSERT INTO poke_profiles (id, name, webhook_url, api_key) VALUES (7, 'Legacy', 'https://example.test', 'key')
  `).run();
  legacyDb.prepare(`
    INSERT INTO users (
      id, username, email, display_name, password_hash, role, ntfy_topic,
      email_notifications, pushover_user_key, has_schul_access,
      schul_poke_profile_id, schul_wetter_ort, schul_haltestelle_name,
      schul_haltestelle_id, schul_haltestellen, schul_nahe_haltestellen
    ) VALUES (11, 'legacy-user', 'legacy@example.test', 'Legacy Name', 'hash', 'user',
      'legacy-topic', 0, 'push-user-key', 1, 7, 'Bochum', 'Hauptbahnhof',
      'stop-7', '[{"id":"stop-7","name":"Hauptbahnhof"}]', 1)
  `).run();
  legacyDb.prepare(`
    INSERT INTO messages (user_id, content, poke_payload) VALUES (11, 'historische Nachricht', '{}')
  `).run();
  legacyDb.close();

  const migration = spawnSync(process.execPath, ['-e', "require('./src/db').db.close()"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8',
  });
  try {
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    const migratedDb = new Database(dbPath, { readonly: true });
    const emailColumn = migratedDb.prepare('PRAGMA table_info(users)').all().find(column => column.name === 'email');
    const user = migratedDb.prepare('SELECT * FROM users WHERE id = 11').get();
    const message = migratedDb.prepare('SELECT content FROM messages WHERE user_id = 11').get();
    assert.equal(emailColumn.notnull, 0);
    assert.equal(user.display_name, 'Legacy Name');
    assert.equal(user.ntfy_topic, 'legacy-topic');
    assert.equal(user.email_notifications, 0);
    assert.equal(user.pushover_user_key, 'push-user-key');
    assert.equal(user.schul_poke_profile_id, 7);
    assert.equal(user.schul_haltestellen, '[{"id":"stop-7","name":"Hauptbahnhof"}]');
    assert.equal(message.content, 'historische Nachricht');
    assert.deepEqual(migratedDb.pragma('foreign_key_check'), []);
    migratedDb.close();

    const backupName = fs.readdirSync(path.join(tempDir, 'backups')).find(name => name.startsWith('pre_migration_'));
    assert.ok(backupName, 'Vor-Migrations-Backup wurde erstellt');
    const backupDb = new Database(path.join(tempDir, 'backups', backupName), { readonly: true });
    assert.equal(backupDb.prepare('SELECT username FROM users WHERE id = 11').get().username, 'legacy-user');
    assert.equal(backupDb.prepare('SELECT content FROM messages WHERE user_id = 11').get().content, 'historische Nachricht');
    assert.equal(backupDb.pragma('integrity_check')[0].integrity_check, 'ok');
    backupDb.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('E-Mail-Migration rollt bei Fremdschlüsselverletzungen vollständig zurück', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-migration-rollback-'));
  const dbPath = path.join(tempDir, 'yrelay.db');
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      invite_token TEXT,
      invite_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'free', content TEXT NOT NULL, poke_payload TEXT NOT NULL
    );
  `);
  legacyDb.prepare('INSERT INTO users (id, username, email) VALUES (11, ?, ?)')
    .run('rollback-user', 'rollback@example.test');
  legacyDb.pragma('foreign_keys = OFF');
  legacyDb.prepare('INSERT INTO messages (user_id, content, poke_payload) VALUES (999, ?, ?)')
    .run('orphan row to reject migration', '{}');
  legacyDb.close();

  const migration = spawnSync(process.execPath, ['-e', "require('./src/db').db.close()"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8',
  });
  try {
    assert.notEqual(migration.status, 0, 'Migration muss bei ungültigen Fremdschlüsseln abbrechen');
    assert.match(migration.stderr, /Fremdschlüsselprüfung nach Migration fehlgeschlagen/);
    const unchangedDb = new Database(dbPath, { readonly: true });
    const user = unchangedDb.prepare('SELECT username, email FROM users WHERE id = 11').get();
    const emailColumn = unchangedDb.prepare('PRAGMA table_info(users)').all().find(column => column.name === 'email');
    assert.deepEqual(user, { username: 'rollback-user', email: 'rollback@example.test' });
    assert.equal(emailColumn.notnull, 1);
    assert.deepEqual(unchangedDb.pragma('foreign_key_check').map(row => row.table), ['messages']);
    assert.equal(unchangedDb.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users_new'").get(), undefined);
    unchangedDb.close();
    assert.ok(fs.readdirSync(path.join(tempDir, 'backups')).some(name => name.startsWith('pre_migration_')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Recovery erhält beide befüllten Nutzertabellen nach einem alten Teilumbau', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-staging-recovery-'));
  const dbPath = path.join(tempDir, 'yrelay.db');
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      invite_token TEXT,
      invite_expires_at DATETIME,
      reset_token TEXT,
      reset_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      has_seen_onboarding INTEGER NOT NULL DEFAULT 0,
      ntfy_topic TEXT,
      email_notifications INTEGER NOT NULL DEFAULT 1,
      pushover_user_key TEXT,
      has_schul_access INTEGER DEFAULT 0,
      schul_poke_profile_id INTEGER,
      schul_wetter_ort TEXT,
      schul_haltestelle_name TEXT,
      schul_haltestelle_id TEXT,
      schul_haltestellen TEXT DEFAULT '[]',
      schul_nahe_haltestellen INTEGER DEFAULT 0
    );
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      invite_token TEXT,
      invite_expires_at DATETIME,
      reset_token TEXT,
      reset_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      has_seen_onboarding INTEGER NOT NULL DEFAULT 0,
      ntfy_topic TEXT,
      email_notifications INTEGER NOT NULL DEFAULT 1,
      pushover_user_key TEXT,
      has_schul_access INTEGER DEFAULT 0,
      schul_poke_profile_id INTEGER,
      schul_wetter_ort TEXT,
      schul_haltestelle_name TEXT,
      schul_haltestelle_id TEXT,
      schul_haltestellen TEXT DEFAULT '[]',
      schul_nahe_haltestellen INTEGER DEFAULT 0
    );
  `);
  legacyDb.prepare('INSERT INTO users (username, email) VALUES (?, ?)').run('current-user', 'current@example.test');
  legacyDb.prepare('INSERT INTO users_new (username, email) VALUES (?, ?)').run('staged-user-1', 'staged1@example.test');
  legacyDb.prepare('INSERT INTO users_new (username, email) VALUES (?, ?)').run('staged-user-2', 'staged2@example.test');
  legacyDb.close();

  const migration = spawnSync(process.execPath, ['-e', "require('./src/db').db.close()"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8',
  });
  try {
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    const recoveredDb = new Database(dbPath, { readonly: true });
    assert.equal(recoveredDb.prepare('SELECT username FROM users').get().username, 'current-user');
    const recoveryTable = recoveredDb.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'users_new_recovery_%'
    `).get();
    assert.ok(recoveryTable);
    assert.equal(recoveredDb.prepare(`SELECT COUNT(*) AS count FROM "${recoveryTable.name}"`).get().count, 2);
    recoveredDb.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});