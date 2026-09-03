const fs = require('fs');
const path = require('path');
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
async function backupDatabase(prefix = 'manual') {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${prefix}_${timestamp}.db`;
      const backupPath = path.join(BACKUP_DIR, backupFilename);

      const db = new Database(DB_PATH, { readonly: true });
      
      db.backup(backupPath, {
        progress({ totalPages, remainingPages }) {
          // Optional: Progress Logging
        }
      })
      .then(() => {
        const pruefDb = new Database(backupPath, { readonly: true });
        const pruefung = pruefDb.prepare('PRAGMA integrity_check').get();
        pruefDb.close();
        if (pruefung.integrity_check !== 'ok') throw new Error('Backup-Integritätsprüfung fehlgeschlagen.');
        db.close();
        _cleanupOldBackups();
        resolve(backupPath);
      })
      .catch((err) => {
        db.close();
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Bereinigt alte Backups, behält maximal die neuesten 15 Backups.
 */
function _cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), ctime: fs.statSync(path.join(BACKUP_DIR, f)).ctime }))
      .sort((a, b) => b.ctime - a.ctime); // Neueste zuerst

    // Lösche alles nach den ersten 15 Backups
    if (files.length > 15) {
      const toDelete = files.slice(15);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
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
function restoreBackup(filename) {
  if (!filename || filename !== path.basename(filename) || !filename.endsWith('.db')) {
    throw new Error('Ungültiger Backup-Dateiname.');
  }
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup-Datei nicht gefunden.');
  }

  // Kopiere die Backup-Datei sicher über die bestehende Datenbank-Datei.
  // SQLite WAL/SHM sollten dabei am besten entfernt werden, damit keine Konflikte entstehen.
  fs.copyFileSync(backupPath, DB_PATH);
  
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
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
