// Routes für Rechtstexte (Datenschutz, Impressum)
// - öffentlich:  GET /api/rechtstexte, GET /api/rechtstexte/:art
// - nur Admin:   GET/PUT /api/admin/rechtstexte
const express = require('express');
const { logAudit } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const rechtstexte = require('../services/rechtstexte');

// ─── Öffentlich (auch ohne Login, z. B. auf der Anmeldeseite) ───────────────
const oeffentlich = express.Router();

oeffentlich.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(rechtstexte.uebersicht());
});

oeffentlich.get('/:art', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  const { art } = req.params;
  if (!rechtstexte.istArt(art)) return res.status(404).json({ fehler: 'Unbekannter Rechtstext.' });
  const eintrag = rechtstexte.lesen(art);
  if (eintrag.modus === 'url') {
    return res.json({ art, titel: eintrag.titel, modus: 'url', url: rechtstexte.pruefeUrl(eintrag.url) });
  }
  if (eintrag.modus === 'text') {
    return res.json({ art, titel: eintrag.titel, modus: 'text', html: rechtstexte.markdownZuHtml(eintrag.text) });
  }
  return res.status(404).json({ fehler: `${eintrag.titel} ist nicht hinterlegt.` });
});

// ─── Admin ──────────────────────────────────────────────────────────────────
const admin = express.Router();
admin.use(requireAdmin);

admin.get('/', (req, res) => {
  const ergebnis = {};
  for (const art of Object.keys(rechtstexte.ARTEN)) {
    const { titel, modus, url, text } = rechtstexte.lesen(art);
    ergebnis[art] = { titel, modus, url, text };
  }
  res.json(ergebnis);
});

admin.put('/', (req, res) => {
  const body = req.body || {};
  const unbekannt = Object.keys(body).filter(art => !rechtstexte.istArt(art));
  if (unbekannt.length) return res.status(400).json({ fehler: 'Unbekannter Rechtstext.' });

  // Erst alles prüfen, dann speichern (keine halb gespeicherten Zustände)
  const geprueft = {};
  try {
    for (const art of Object.keys(body)) geprueft[art] = rechtstexte.validieren(art, body[art]);
  } catch (err) {
    return res.status(err.status || 400).json({ fehler: err.message });
  }
  for (const [art, werte] of Object.entries(geprueft)) rechtstexte.speichern(art, werte);

  logAudit(req.user.id, 'admin_rechtstexte_updated', {
    arten: Object.fromEntries(Object.entries(geprueft).map(([art, w]) => [art, w.modus])),
  });
  res.json({ nachricht: 'Rechtstexte gespeichert.', rechtstexte: rechtstexte.uebersicht() });
});

module.exports = { oeffentlich, admin };
