// Datenbankinitialisierung und Schema für yRelay
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/yrelay.db');

// Stelle sicher, dass das Verzeichnis existiert
const fs = require('fs');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const backupDir = path.join(dbDir, 'backups');
const restoreManifestPath = path.join(backupDir, 'restore-pending.json');

function pruefeDatenbankdatei(filePath) {
  const pruefDb = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = pruefDb.pragma('integrity_check');
    const foreignKeys = pruefDb.pragma('foreign_key_check');
    if (integrity[0]?.integrity_check !== 'ok' || foreignKeys.length > 0) {
      throw new Error('Integritäts- oder Fremdschlüsselprüfung der Datenbankdatei fehlgeschlagen.');
    }
  } finally {
    pruefDb.close();
  }
}

function entferneSqliteSidecars() {
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${DB_PATH}${suffix}`;
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }
}

function wendeAusstehendeWiederherstellungAn() {
  if (!fs.existsSync(restoreManifestPath)) return;

  let manifest = null;
  let stagingPath = null;
  let rollbackPath = null;
  let replacementPath = null;
  let databaseReplaced = false;

  try {
    manifest = JSON.parse(fs.readFileSync(restoreManifestPath, 'utf8'));
    if (
      !manifest ||
      typeof manifest.stagingFile !== 'string' ||
      path.basename(manifest.stagingFile) !== manifest.stagingFile ||
      !manifest.stagingFile.startsWith('restore-stage-') ||
      typeof manifest.rollbackFile !== 'string' ||
      path.basename(manifest.rollbackFile) !== manifest.rollbackFile ||
      !manifest.rollbackFile.startsWith('pre_restore_') ||
      !manifest.rollbackFile.endsWith('.db')
    ) {
      throw new Error('Wiederherstellungsmanifest ist ungültig.');
    }

    stagingPath = path.join(backupDir, manifest.stagingFile);
    rollbackPath = path.join(backupDir, manifest.rollbackFile);
    pruefeDatenbankdatei(stagingPath);
    pruefeDatenbankdatei(rollbackPath);

    if (fs.existsSync(DB_PATH)) {
      const aktuelleDb = new Database(DB_PATH);
      try {
        const checkpoint = aktuelleDb.pragma('wal_checkpoint(TRUNCATE)')[0];
        if (checkpoint?.busy) throw new Error('Aktuelle Datenbank ist noch in Benutzung; Restore wurde abgebrochen.');
      } finally {
        aktuelleDb.close();
      }
    }

    entferneSqliteSidecars();
    replacementPath = `${DB_PATH}.restore-${process.pid}`;
    fs.copyFileSync(stagingPath, replacementPath);
    pruefeDatenbankdatei(replacementPath);
    fs.renameSync(replacementPath, DB_PATH);
    databaseReplaced = true;
    pruefeDatenbankdatei(DB_PATH);
    fs.unlinkSync(stagingPath);
    fs.unlinkSync(restoreManifestPath);
    console.log(`[yRelay] Datenbank aus Backup ${manifest.sourceFile} wiederhergestellt.`);
  } catch (err) {
    if (replacementPath && fs.existsSync(replacementPath)) fs.unlinkSync(replacementPath);
    if (databaseReplaced && rollbackPath && fs.existsSync(rollbackPath)) {
      const rollbackTemp = `${DB_PATH}.rollback-${process.pid}`;
      fs.copyFileSync(rollbackPath, rollbackTemp);
      fs.renameSync(rollbackTemp, DB_PATH);
      entferneSqliteSidecars();
      pruefeDatenbankdatei(DB_PATH);
    }
    if (fs.existsSync(restoreManifestPath)) {
      fs.renameSync(restoreManifestPath, `${restoreManifestPath}.failed-${Date.now()}`);
    }
    console.error('[yRelay] Wiederherstellung fehlgeschlagen; vorhandene bzw. vor dem Restore gesicherte Datenbank bleibt erhalten:', err.message);
  }
}

wendeAusstehendeWiederherstellungAn();

const db = new Database(DB_PATH);

// Performance-Optimierungen
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const usersTableExists = () => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get('users');
const usersStagingExists = () => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get('users_new');
if (usersStagingExists()) {
  const currentUserCount = usersTableExists() ? db.prepare('SELECT COUNT(*) AS count FROM users').get().count : 0;
  const stagedUserCount = db.prepare('SELECT COUNT(*) AS count FROM users_new').get().count;
  db.pragma('foreign_keys = OFF');
  try {
    const recoverUsers = db.transaction(() => {
      if (!usersTableExists() || (currentUserCount === 0 && stagedUserCount > 0)) {
        if (usersTableExists()) db.exec('DROP TABLE users');
        db.exec('ALTER TABLE users_new RENAME TO users');
      } else if (currentUserCount === 0 || stagedUserCount === 0) {
        db.exec('DROP TABLE users_new');
      } else {
        const recoveryTable = `users_new_recovery_${Date.now()}`;
        db.exec(`ALTER TABLE users_new RENAME TO ${recoveryTable}`);
        console.warn(`[yRelay] Beide Nutzer-Migrationstabellen enthalten Daten; staging wurde als ${recoveryTable} erhalten.`);
      }
    });
    recoverUsers();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  console.warn('[yRelay] Verwaister users_new-Migrationrest wurde sicher bereinigt bzw. wiederhergestellt.');
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.length === 0) throw new Error(`Migrationstabelle "${tableName}" existiert nicht.`);
  if (!columns.some(column => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

// Tabellen anlegen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
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
    has_seen_onboarding INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'free',
    priority TEXT,
    content TEXT NOT NULL,
    poke_payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'gesendet',
    error_message TEXT,
    reply_token TEXT,
    reply_content TEXT,
    replied_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schul_kalender_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    start DATETIME NOT NULL,
    ende DATETIME,
    ganztaegig INTEGER NOT NULL DEFAULT 0,
    notiz TEXT
  );

  CREATE TABLE IF NOT EXISTS schul_aufgaben_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    faellig DATETIME,
    erledigt INTEGER NOT NULL DEFAULT 0,
    notiz TEXT
  );

  CREATE TABLE IF NOT EXISTS schul_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    typ TEXT NOT NULL,
    inhalt TEXT NOT NULL,
    zeitpunkt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schul_klausuren_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    datum DATETIME NOT NULL,
    notiz TEXT
  );

  CREATE TABLE IF NOT EXISTS schul_chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    absender TEXT NOT NULL CHECK(absender IN ('nutzer', 'poke')),
    inhalt TEXT NOT NULL,
    zeitpunkt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schul_pings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    inhalt TEXT NOT NULL,
    gelesen INTEGER NOT NULL DEFAULT 0,
    zeitpunkt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schul_stundenplan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    wochentag INTEGER NOT NULL,
    fach TEXT NOT NULL,
    lehrer TEXT,
    start TEXT NOT NULL,
    ende TEXT,
    raum TEXT,
    notiz TEXT,
    aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schul_kacheln (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL REFERENCES schul_integrationen(id) ON DELETE CASCADE,
    schluessel TEXT NOT NULL,
    titel TEXT NOT NULL,
    icon TEXT DEFAULT '🧩',
    farbe TEXT DEFAULT '#6366f1',
    inhalt TEXT NOT NULL,
    formular TEXT,
    sortierung INTEGER NOT NULL DEFAULT 0,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
    aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (integration_id, schluessel)
  );
`);

// Migrationen für bestehende Tabellen
ensureColumn('users', 'display_name', 'display_name TEXT');
ensureColumn('users', 'reset_token', 'reset_token TEXT');
ensureColumn('users', 'reset_expires_at', 'reset_expires_at DATETIME');
ensureColumn('users', 'has_seen_onboarding', 'has_seen_onboarding INTEGER NOT NULL DEFAULT 0');
ensureColumn('messages', 'user_replies', 'user_replies TEXT');
ensureColumn('messages', 'reminder_sent_at', 'reminder_sent_at DATETIME');
ensureColumn('messages', 'user_notified_at', 'user_notified_at DATETIME');
ensureColumn('messages', 'send_at', 'send_at DATETIME');
ensureColumn('messages', 'is_pinned', 'is_pinned INTEGER NOT NULL DEFAULT 0');
ensureColumn('messages', 'status_label', 'status_label TEXT');
ensureColumn('messages', 'status_label_notiz', 'status_label_notiz TEXT');
ensureColumn('users', 'ntfy_topic', 'ntfy_topic TEXT');
ensureColumn('users', 'email_notifications', 'email_notifications INTEGER NOT NULL DEFAULT 1');
ensureColumn('users', 'pushover_user_key', 'pushover_user_key TEXT');

// Feature: Audit Logs
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Feature: Nutzer Labels
db.exec(`
  CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    farbe TEXT NOT NULL DEFAULT '#6366f1',
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nutzer_labels (
    nutzer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (nutzer_id, label_id)
  );
`);

// Feature: Multi-Poke-Profile
db.exec(`
  CREATE TABLE IF NOT EXISTS poke_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🤖',
    farbe TEXT DEFAULT '#6366f1',
    webhook_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    transport TEXT NOT NULL DEFAULT 'webhook',
    email TEXT,
    interface_mode TEXT NOT NULL DEFAULT 'api',
    beschreibung TEXT,
    ist_standard INTEGER DEFAULT 0,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nutzer_poke_profile (
    nutzer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profil_id INTEGER NOT NULL REFERENCES poke_profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (nutzer_id, profil_id)
  );

  CREATE TABLE IF NOT EXISTS schul_integrationen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nutzer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profil_id INTEGER NOT NULL REFERENCES poke_profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    modus TEXT NOT NULL DEFAULT 'auto',
    pingvin_url TEXT,
    pingvin_user TEXT,
    pingvin_password TEXT,
    letzter_status INTEGER,
    versand_retry_at DATETIME,
    zuletzt_aktualisiert DATETIME,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nutzer_id, profil_id)
  );
`);

ensureColumn('poke_profiles', 'transport', "transport TEXT NOT NULL DEFAULT 'webhook'");
ensureColumn('poke_profiles', 'email', 'email TEXT');
ensureColumn('poke_profiles', 'interface_mode', "interface_mode TEXT NOT NULL DEFAULT 'api'");

// Die Schul-Cache-Tabellen wurden vor den Integrationen angelegt. Bestehende
// Installationen erhalten die neue Zuordnung deshalb separat.
for (const table of ['schul_kalender_cache', 'schul_aufgaben_cache', 'schul_feed', 'schul_klausuren_cache', 'schul_chat', 'schul_pings']) {
  ensureColumn(table, 'integration_id', 'integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE');
}

ensureColumn('schul_integrationen', 'pingvin_url', 'pingvin_url TEXT');
ensureColumn('schul_integrationen', 'pingvin_user', 'pingvin_user TEXT');
ensureColumn('schul_integrationen', 'pingvin_password', 'pingvin_password TEXT');
ensureColumn('schul_integrationen', 'modus', "modus TEXT NOT NULL DEFAULT 'auto'");
ensureColumn('schul_integrationen', 'letzter_status', 'letzter_status INTEGER');
ensureColumn('schul_integrationen', 'versand_retry_at', 'versand_retry_at DATETIME');
ensureColumn('schul_stundenplan', 'lehrer', 'lehrer TEXT');
ensureColumn('schul_integrationen', 'zuletzt_aktualisiert', 'zuletzt_aktualisiert DATETIME');

// Migration: poke_profile_id zu messages hinzufügen
ensureColumn('messages', 'poke_profile_id', 'poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL');

// Migration: Schul-Dashboard Berechtigungen
ensureColumn('users', 'has_schul_access', 'has_schul_access BOOLEAN DEFAULT 0');
ensureColumn('users', 'schul_poke_profile_id', 'schul_poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL');
ensureColumn('users', 'schul_wetter_ort', 'schul_wetter_ort TEXT');
ensureColumn('users', 'schul_haltestelle_name', 'schul_haltestelle_name TEXT');
ensureColumn('users', 'schul_haltestelle_id', 'schul_haltestelle_id TEXT');
ensureColumn('users', 'schul_haltestellen', "schul_haltestellen TEXT DEFAULT '[]'");
ensureColumn('users', 'schul_nahe_haltestellen', 'schul_nahe_haltestellen INTEGER DEFAULT 0');

// Migration: Einzelne Haltestelle ins Array übernehmen falls Array leer ist
{
  const usersToMigrate = db.prepare(`SELECT id, schul_haltestelle_name, schul_haltestelle_id, schul_haltestellen FROM users WHERE schul_haltestelle_id IS NOT NULL`).all();
  const updateStmt = db.prepare(`UPDATE users SET schul_haltestellen = ? WHERE id = ?`);
  const migrateHaltestellen = db.transaction(() => {
    for (const u of usersToMigrate) {
      if (!u.schul_haltestellen || u.schul_haltestellen === '[]') {
        const arr = [{ id: u.schul_haltestelle_id, name: u.schul_haltestelle_name }];
        updateStmt.run(JSON.stringify(arr), u.id);
      }
    }
  });
  migrateHaltestellen();
}

const emailInfo = db.prepare('PRAGMA table_info(users)').all().find(column => column.name === 'email');
if (emailInfo?.notnull === 1) {
  console.log('[yRelay] Führe Datenbank-Migration durch: E-Mail optional machen...');
  const knownUserColumns = new Set([
    'id', 'username', 'email', 'display_name', 'password_hash', 'role', 'is_active',
    'invite_token', 'invite_expires_at', 'reset_token', 'reset_expires_at', 'created_at',
    'last_login', 'has_seen_onboarding', 'ntfy_topic', 'email_notifications', 'pushover_user_key',
    'has_schul_access', 'schul_poke_profile_id', 'schul_wetter_ort', 'schul_haltestelle_name',
    'schul_haltestelle_id', 'schul_haltestellen', 'schul_nahe_haltestellen',
  ]);
  const unknownColumns = db.prepare('PRAGMA table_info(users)').all()
    .map(column => column.name)
    .filter(column => !knownUserColumns.has(column));
  const customObjects = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE tbl_name = 'users' AND type IN ('index', 'trigger')
      AND name NOT LIKE 'sqlite_autoindex_%'
  `).all();
  if (unknownColumns.length > 0 || customObjects.length > 0) {
    throw new Error(`E-Mail-Migration aus Sicherheitsgründen abgebrochen: unbekannte Userschema-Erweiterungen (${[...unknownColumns, ...customObjects.map(item => item.name)].join(', ')}).`);
  }
  const backupDir = path.join(dbDir, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `pre_migration_${Date.now()}.db`);
  db.prepare('VACUUM INTO ?').run(backupPath);
  const migrationBackupDb = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = migrationBackupDb.pragma('integrity_check');
    if (integrity[0]?.integrity_check !== 'ok') throw new Error('Vor-Migrations-Backup ist nicht konsistent.');
  } finally {
    migrationBackupDb.close();
  }
  const backupFd = fs.openSync(backupPath, 'r');
  try { fs.fsyncSync(backupFd); } finally { fs.closeSync(backupFd); }
  console.log('[yRelay] Konsistentes Sicherheits-Backup vor Migration erstellt:', backupPath);

  db.pragma('foreign_keys = OFF');
  try {
    const migrateUsers = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
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
          email_notifications INTEGER NOT NULL DEFAULT 1,
          pushover_user_key TEXT,
          has_schul_access BOOLEAN DEFAULT 0,
          schul_poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL,
          schul_wetter_ort TEXT,
          schul_haltestelle_name TEXT,
          schul_haltestelle_id TEXT,
          schul_haltestellen TEXT DEFAULT '[]',
          schul_nahe_haltestellen INTEGER DEFAULT 0
        );
        INSERT INTO users_new (
          id, username, email, display_name, password_hash, role, is_active,
          invite_token, invite_expires_at, reset_token, reset_expires_at,
          created_at, last_login, has_seen_onboarding, ntfy_topic,
          email_notifications, pushover_user_key, has_schul_access,
          schul_poke_profile_id, schul_wetter_ort, schul_haltestelle_name,
          schul_haltestelle_id, schul_haltestellen, schul_nahe_haltestellen
        )
        SELECT
          id, username, email, display_name, password_hash, role, is_active,
          invite_token, invite_expires_at, reset_token, reset_expires_at,
          created_at, last_login, has_seen_onboarding, ntfy_topic,
          email_notifications, pushover_user_key, has_schul_access,
          schul_poke_profile_id, schul_wetter_ort, schul_haltestelle_name,
          schul_haltestelle_id, schul_haltestellen, schul_nahe_haltestellen
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      const violations = db.pragma('foreign_key_check');
      if (violations.length > 0) throw new Error(`Fremdschlüsselprüfung nach Migration fehlgeschlagen (${violations.length} Verletzungen).`);
    });
    migrateUsers();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  console.log('[yRelay] Migration abgeschlossen.');
}


// Initialen Admin-Nutzer anlegen falls noch keiner existiert
function initAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yrelay.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run(adminUsername, adminEmail, hash);
    console.log(`[yRelay] Admin-Nutzer erstellt: ${adminUsername} / ${adminEmail}`);
  }
}

// Standard-Einstellungen anlegen falls nicht vorhanden
function initSettings() {
  const defaults = [
    ['poke_webhook_url', process.env.POKE_WEBHOOK_URL || ''],
    ['poke_api_key', process.env.POKE_API_KEY || ''],
    ['deepgram_api_key', process.env.DEEPGRAM_API_KEY || ''],
    ['smtp_host', process.env.SMTP_HOST || ''],
    ['smtp_port', process.env.SMTP_PORT || '587'],
    ['smtp_user', process.env.SMTP_USER || ''],
    ['smtp_pass', process.env.SMTP_PASS || ''],
    ['smtp_from', process.env.SMTP_FROM || ''],
    ['pushover_app_token', process.env.PUSHOVER_APP_TOKEN || ''],
    ['app_url', process.env.APP_URL || 'http://localhost:3000'],
    ['schul_startzeit', '08:00'],
    ['schul_endzeit', '15:00'],
    ['schul_wochentage', '1,2,3,4,5'],
    ['schul_ferien', '[]'],
    ['schul_zeitzone', 'Europe/Berlin'],
    ['schul_vorlauf_minuten', '15'],
    ['schul_nachlauf_minuten', '15'],
  ];

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO NOTHING
  `);

  const insertMany = db.transaction((items) => {
    for (const [key, value] of items) {
      upsert.run(key, value);
    }
  });
  insertMany(defaults);
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  // Wenn ein Wert in der DB steht und nicht leer ist, nutze ihn.
  // Ansonsten falle auf die Umgebungsvariablen (z.B. aus docker-compose) zurück.
  if (row && row.value !== '') return row.value;
  return process.env[key.toUpperCase()] || '';
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

function logAudit(userId, action, detailsObj = {}) {
  try {
    const detailsStr = JSON.stringify(detailsObj);
    db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(userId || null, action, detailsStr);
  } catch (err) {
    console.error('[yRelay] Fehler beim Schreiben des Audit Logs:', err);
  }
}

/**
 * Migriert beim ersten Start den poke_webhook_url / poke_api_key aus den Settings
 * automatisch in ein Standard-Poke-Profil, falls noch kein Profil existiert.
 */
function initPokeProfile() {
  const existing = db.prepare('SELECT id FROM poke_profiles LIMIT 1').get();
  if (!existing) {
    const webhookUrl = getSetting('poke_webhook_url');
    const apiKey = getSetting('poke_api_key');
    if (webhookUrl && apiKey) {
      db.prepare(`
        INSERT INTO poke_profiles (name, icon, farbe, webhook_url, api_key, beschreibung, ist_standard)
        VALUES ('Standard-Poke', '🤖', '#6366f1', ?, ?, 'Automatisch migriertes Standard-Profil', 1)
      `).run(webhookUrl, apiKey);
      console.log('[yRelay] Standard-Poke-Profil aus Settings migriert.');
    }
  }
}

module.exports = { db, initAdminUser, initSettings, getSetting, setSetting, logAudit, initPokeProfile };

// ─── Spielebereich ───────────────────────────────────────────────────────────

// Spiele-Tabellen
db.exec(`
  CREATE TABLE IF NOT EXISTS game_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type TEXT UNIQUE NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    access_mode TEXT NOT NULL DEFAULT 'none',
    label_ids TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    webhook_token TEXT NOT NULL,
    poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Standard-Spielkonfigurationen anlegen
const spielTypen = ['connect4', 'battleship', 'tictactoe', 'ludo', 'wordgame', 'akinator'];
const upsertGameConfig = db.prepare(`
  INSERT INTO game_configs (game_type, is_enabled, access_mode)
  VALUES (?, 0, 'none')
  ON CONFLICT(game_type) DO NOTHING
`);
for (const typ of spielTypen) {
  upsertGameConfig.run(typ);
}

