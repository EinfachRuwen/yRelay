// yRelay - Poke-Profile Routes
// Verwaltet mehrere Poke-KI-Instanzen mit eigenen API-Keys
const express = require('express');
const { db, logAudit } = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/poke-profile/meine - Eigene zugewiesene Profile (für Dashboard)
router.get('/meine', requireAuth, (req, res) => {
  const nutzerProfile = db.prepare(`
    SELECT pp.id, pp.name, pp.icon, pp.farbe, pp.beschreibung, pp.ist_standard
    FROM poke_profiles pp
    JOIN nutzer_poke_profile npp ON pp.id = npp.profil_id
    WHERE npp.nutzer_id = ?
    ORDER BY pp.ist_standard DESC, pp.name ASC
  `).all(req.user.id);

  if (nutzerProfile.length === 0) {
    const standard = db.prepare('SELECT id, name, icon, farbe, beschreibung, ist_standard FROM poke_profiles WHERE ist_standard = 1 LIMIT 1').get();
    if (standard) return res.json([standard]);
    return res.json([]);
  }

  res.json(nutzerProfile);
});

// GET /api/poke-profile - Alle Profile laden (Admin)
router.get('/', requireAdmin, (req, res) => {
  const profile = db.prepare(`
    SELECT pp.*,
      (SELECT COUNT(*) FROM nutzer_poke_profile WHERE profil_id = pp.id) as nutzerAnzahl
    FROM poke_profiles pp
    ORDER BY pp.ist_standard DESC, pp.name ASC
  `).all();
  res.json(profile.map(({ api_key, ...profil }) => ({
    ...profil,
    api_key_gesetzt: !!api_key,
  })));
});

// POST /api/poke-profile - Neues Profil erstellen
router.post('/', requireAdmin, (req, res) => {
  const { name, icon, farbe, webhook_url, api_key, beschreibung, ist_standard } = req.body;
  if (!name || !webhook_url || !api_key) {
    return res.status(400).json({ fehler: 'Name, Webhook-URL und API-Key sind Pflichtfelder.' });
  }

  if (ist_standard) {
    db.prepare('UPDATE poke_profiles SET ist_standard = 0').run();
  }

  const ergebnis = db.prepare(`
    INSERT INTO poke_profiles (name, icon, farbe, webhook_url, api_key, beschreibung, ist_standard)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), icon || '🤖', farbe || '#6366f1',
    webhook_url.trim(), api_key.trim(), beschreibung?.trim() || null, ist_standard ? 1 : 0
  );

  logAudit(req.user.id, 'admin_create_poke_profile', { profil_id: ergebnis.lastInsertRowid, name });
  res.status(201).json({ id: ergebnis.lastInsertRowid, nachricht: `Poke-Profil "${name}" erfolgreich erstellt.` });
});

// PUT /api/poke-profile/:id - Profil bearbeiten
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, icon, farbe, webhook_url, api_key, beschreibung, ist_standard } = req.body;

  const profil = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(id);
  if (!profil) return res.status(404).json({ fehler: 'Poke-Profil nicht gefunden.' });

  if (!name || !webhook_url || (!api_key && !profil.api_key)) {
    return res.status(400).json({ fehler: 'Name, Webhook-URL und API-Key sind Pflichtfelder.' });
  }

  if (ist_standard) {
    db.prepare('UPDATE poke_profiles SET ist_standard = 0').run();
  }

  db.prepare(`
    UPDATE poke_profiles SET name = ?, icon = ?, farbe = ?, webhook_url = ?, api_key = ?, beschreibung = ?, ist_standard = ?
    WHERE id = ?
  `).run(name.trim(), icon || '🤖', farbe || '#6366f1', webhook_url.trim(), api_key ? api_key.trim() : profil.api_key, beschreibung?.trim() || null, ist_standard ? 1 : 0, id);

  logAudit(req.user.id, 'admin_edit_poke_profile', { profil_id: id, name });
  res.json({ nachricht: `Poke-Profil "${name}" erfolgreich gespeichert.` });
});

// DELETE /api/poke-profile/:id - Profil löschen (nicht Standard)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const profil = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(id);
  if (!profil) return res.status(404).json({ fehler: 'Poke-Profil nicht gefunden.' });
  if (profil.ist_standard) {
    return res.status(400).json({ fehler: 'Das Standard-Profil kann nicht gelöscht werden.' });
  }

  db.prepare('DELETE FROM poke_profiles WHERE id = ?').run(id);
  logAudit(req.user.id, 'admin_delete_poke_profile', { profil_id: id, name: profil.name });
  res.json({ nachricht: `Poke-Profil "${profil.name}" gelöscht.` });
});

// PUT /api/poke-profile/nutzer/:nutzerId - Profile einem Nutzer zuweisen
router.put('/nutzer/:nutzerId', requireAdmin, (req, res) => {
  const { nutzerId } = req.params;
  const { profilIds } = req.body;

  const nutzer = db.prepare('SELECT id, username FROM users WHERE id = ?').get(nutzerId);
  if (!nutzer) return res.status(404).json({ fehler: 'Nutzer nicht gefunden.' });

  db.prepare('DELETE FROM nutzer_poke_profile WHERE nutzer_id = ?').run(nutzerId);

  if (Array.isArray(profilIds) && profilIds.length > 0) {
    const gueltigeProfile = db.prepare(`
      SELECT id FROM poke_profiles WHERE id IN (${profilIds.map(() => '?').join(',')})
    `).all(...profilIds.map(Number)).map(p => p.id);
    const insert = db.prepare('INSERT OR IGNORE INTO nutzer_poke_profile (nutzer_id, profil_id) VALUES (?, ?)');
    const insertMany = db.transaction((ids) => { for (const pid of ids) insert.run(nutzerId, pid); });
    insertMany(gueltigeProfile);
  }

  logAudit(req.user.id, 'admin_assign_poke_profiles', { target_user_id: nutzerId, profil_ids: profilIds });
  res.json({ nachricht: `Poke-Profile für "${nutzer.username}" aktualisiert.` });
});

module.exports = router;
