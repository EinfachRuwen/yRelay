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

const db = new Database(DB_PATH);

// Performance-Optimierungen
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
`);

// Migrationen für bestehende Tabellen
try {
  db.exec('ALTER TABLE users ADD COLUMN display_name TEXT;');
} catch (e) {}

// E-Mail optional machen (NOT NULL entfernen benötigt Table Rebuild)
const emailInfo = db.prepare("PRAGMA table_info(users)").all().find(c => c.name === 'email');
if (emailInfo && emailInfo.notnull === 1) {
  console.log('[yRelay] Führe Datenbank-Migration durch: E-Mail optional machen...');
  
  // 🚨 Pre-Migration Backup (Synchron)
  const backupDir = path.join(dbDir, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'pre_migration_' + Date.now() + '.db');
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('[yRelay] Sicherheits-Backup vor Migration erstellt:', backupPath);

  // Fremdschlüssel-Prüfungen deaktivieren, um CASCADE-Deletes (wie bei Nachrichten) zu verhindern!
  db.pragma('foreign_keys = OFF');
  
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
      ntfy_topic TEXT
    );
    INSERT INTO users_new (id, username, email, display_name, password_hash, role, is_active, invite_token, invite_expires_at, reset_token, reset_expires_at, created_at, last_login, has_seen_onboarding, ntfy_topic)
    SELECT id, username, email, display_name, password_hash, role, is_active, invite_token, invite_expires_at, reset_token, reset_expires_at, created_at, last_login, has_seen_onboarding, ntfy_topic
    FROM users;
    
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);

  db.pragma('foreign_keys = ON'); // Wieder aktivieren
  console.log('[yRelay] Migration abgeschlossen.');
}

try {
  db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN reset_expires_at DATETIME;');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN has_seen_onboarding INTEGER NOT NULL DEFAULT 0;');
} catch (e) {}
try {
  // Nutzer-Gegenantworten auf Poke-Antworten (JSON-Array)
  db.exec('ALTER TABLE messages ADD COLUMN user_replies TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE messages ADD COLUMN reminder_sent_at DATETIME;');
} catch (e) {}
try {
  db.exec('ALTER TABLE messages ADD COLUMN user_notified_at DATETIME;');
} catch (e) {}
try {
  // Feature: Geplante Nachrichten
  db.exec('ALTER TABLE messages ADD COLUMN send_at DATETIME;');
} catch (e) {}
try {
  // Feature: Nachrichten pinnen
  db.exec('ALTER TABLE messages ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;');
} catch (e) {}
try {
  // Feature: Status-Label von Poke (z.B. "erledigt", "in_bearbeitung")
  db.exec('ALTER TABLE messages ADD COLUMN status_label TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE messages ADD COLUMN status_label_notiz TEXT;');
} catch (e) {}

try {
  // Feature: ntfy Topic für Push-Benachrichtigungen
  db.exec('ALTER TABLE users ADD COLUMN ntfy_topic TEXT;');
} catch (e) {}

// Feature: E-Mail Benachrichtigungen deaktivieren
try {
  db.exec('ALTER TABLE users ADD COLUMN email_notifications INTEGER NOT NULL DEFAULT 1;');
} catch (e) {}

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
    letzter_status INTEGER,
    zuletzt_aktualisiert DATETIME,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nutzer_id, profil_id)
  );
`);

// Die Schul-Cache-Tabellen wurden vor den Integrationen angelegt. Bestehende
// Installationen erhalten die neue Zuordnung deshalb separat.
for (const table of ['schul_kalender_cache', 'schul_aufgaben_cache', 'schul_feed']) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN integration_id INTEGER REFERENCES schul_integrationen(id) ON DELETE CASCADE;`);
  } catch (e) {}
}
try { db.exec("ALTER TABLE schul_integrationen ADD COLUMN modus TEXT NOT NULL DEFAULT 'auto';"); } catch (e) {}
try { db.exec('ALTER TABLE schul_integrationen ADD COLUMN letzter_status INTEGER;'); } catch (e) {}
try { db.exec('ALTER TABLE schul_integrationen ADD COLUMN zuletzt_aktualisiert DATETIME;'); } catch (e) {}

// Migration: poke_profile_id zu messages hinzufügen
try {
  db.exec('ALTER TABLE messages ADD COLUMN poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL;');
} catch (e) {}

// Migration: Schul-Dashboard Berechtigungen
try {
  db.exec('ALTER TABLE users ADD COLUMN has_schul_access BOOLEAN DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN schul_poke_profile_id INTEGER REFERENCES poke_profiles(id) ON DELETE SET NULL;');
} catch (e) {}

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
    ['app_url', process.env.APP_URL || 'http://localhost:3000'],
    ['schul_startzeit', '08:00'],
    ['schul_endzeit', '15:00'],
    ['schul_wochentage', '1,2,3,4,5'],
    ['schul_ferien', '[]'],
    ['schul_zeitzone', 'Europe/Berlin'],
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
