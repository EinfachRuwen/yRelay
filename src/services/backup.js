const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/yrelay.db');
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

// Stelle sicher, dass das Backup-Verzeichnis existiert
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Erstellt ein sicheres Backup der SQLite-Datenbank.
 * Verwendet die offizielle .backup() Methode, die WAL und Lese-/Schreib-Sperren korrekt behandelt.
 * @param {string} prefix Ein Präfix für den Dateinamen (z.B. 'daily', 'pre_migration', 'manual')
 * @returns {Promise<string>} Der absolute Pfad zur erstellten Backup-Datei.
 */
async function backupDatabase(prefix = 'manual', { preserve = [] } = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `${prefix}_${timestamp}_${process.pid}_${randomUUID()}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);
  const sourceDb = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  try {
    await sourceDb.backup(backupPath);
  } catch (err) {
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    throw err;
  } finally {
    sourceDb.close();
  }

  try {
    const pruefDb = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      const pruefung = pruefDb.pragma('integrity_check');
      if (pruefung[0]?.integrity_check !== 'ok') throw new Error('Backup-Integritätsprüfung fehlgeschlagen.');
    } finally {
      pruefDb.close();
    }
    const fd = fs.openSync(backupPath, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (err) {
    fs.unlinkSync(backupPath);
    throw err;
  }

  _cleanupOldBackups(preserve);
  return backupPath;
}

/**
 * Bereinigt alte Backups, behält maximal die neuesten 15 Backups.
 */
function _cleanupOldBackups(preserve = []) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), ctime: fs.statSync(path.join(BACKUP_DIR, f)).ctime }))
      .sort((a, b) => b.ctime - a.ctime); // Neueste zuerst

    const keep = new Set([...files.slice(0, 15).map(file => file.name), ...preserve]);
    for (const prefix of ['pre_migration_', 'pre_restore_']) {
      const recoveryBackup = files.find(file => file.name.startsWith(prefix));
      if (recoveryBackup) keep.add(recoveryBackup.name);
    }
    for (const file of files) {
      if (!keep.has(file.name)) fs.unlinkSync(file.path);
    }
  } catch (err) {
    console.error('[Backup Service] Fehler beim Bereinigen alter Backups:', err);
  }
}

/**
 * Stellt ein Backup wieder her (Ersetzt die aktuelle Datenbank).
 * ACHTUNG: Dies sollte idealerweise passieren, wenn keine Verbindungen offen sind.
 * @param {string} filename Name der Backup-Datei im Backup-Ordner
 */
async function restoreBackup(filename) {
  if (!filename || filename !== path.basename(filename) || !filename.endsWith('.db')) {
    throw new Error('Ungültiger Backup-Dateiname.');
  }
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup-Datei nicht gefunden.');
  }
  const manifestPath = path.join(BACKUP_DIR, 'restore-pending.json');
  if (fs.existsSync(manifestPath)) throw new Error('Es ist bereits eine Wiederherstellung vorbereitet.');

  const sourceDb = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = sourceDb.pragma('integrity_check');
    const foreignKeys = sourceDb.pragma('foreign_key_check');
    if (integrity[0]?.integrity_check !== 'ok' || foreignKeys.length > 0) {
      throw new Error('Das ausgewählte Backup besteht die Integritäts- oder Fremdschlüsselprüfung nicht.');
    }
  } finally {
    sourceDb.close();
  }

  const stagingFile = `restore-stage-${Date.now()}-${process.pid}-${randomUUID()}.sqlite`;
  const stagingPath = path.join(BACKUP_DIR, stagingFile);
  const stagingTemp = `${stagingPath}.tmp`;
  let manifestTemp = null;
  try {
    fs.copyFileSync(backupPath, stagingTemp);
    const stagingFd = fs.openSync(stagingTemp, 'r');
    try { fs.fsyncSync(stagingFd); } finally { fs.closeSync(stagingFd); }
    fs.renameSync(stagingTemp, stagingPath);
    const rollbackPath = await backupDatabase('pre_restore', { preserve: [filename] });
    manifestTemp = `${manifestPath}.tmp-${process.pid}-${randomUUID()}`;
    fs.writeFileSync(manifestTemp, JSON.stringify({
      sourceFile: filename,
      stagingFile,
      rollbackFile: path.basename(rollbackPath),
    }), { flag: 'wx' });
    const manifestFd = fs.openSync(manifestTemp, 'r');
    try { fs.fsyncSync(manifestFd); } finally { fs.closeSync(manifestFd); }
    if (fs.existsSync(manifestPath)) throw new Error('Es ist bereits eine Wiederherstellung vorbereitet.');
    fs.renameSync(manifestTemp, manifestPath);
  } catch (err) {
    if (fs.existsSync(stagingTemp)) fs.unlinkSync(stagingTemp);
    if (fs.existsSync(stagingPath)) fs.unlinkSync(stagingPath);
    if (manifestTemp && fs.existsSync(manifestTemp)) fs.unlinkSync(manifestTemp);
    throw err;
  }
}

/**
 * Gibt eine Liste aller verfügbaren Backups zurück.
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        sizeBytes: stats.size,
        createdAt: stats.ctime,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  return files;
}

module.exports = {
  backupDatabase,
  restoreBackup,
  listBackups,
};
