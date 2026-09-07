// Spielebereich - Backend Routes
'use strict';
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { db, getSetting, logAudit } = require('../db');
const { sendeFreieNachricht } = require('../services/poke');

// Spiellogik-Module
const Connect4 = require('../services/game-logic/connect4');
const TicTacToe = require('../services/game-logic/tictactoe');
const Battleship = require('../services/game-logic/battleship');
const Ludo = require('../services/game-logic/ludo');
const Wordgame = require('../services/game-logic/wordgame');

const SPIEL_META = {
  connect4:   { name: '4 Gewinnt', icon: '🟡', beschreibung: 'Verbinde 4 Steine in einer Reihe!', maxZuege: 42 },
  tictactoe:  { name: 'Tic Tac Toe', icon: '❌', beschreibung: 'Drei in einer Reihe gewinnt!', maxZuege: 9 },
  battleship: { name: 'Schiffe versenken', icon: '⚓', beschreibung: 'Versenke Pokes Flotte!', maxZuege: 200 },
  ludo:       { name: 'Mensch ärgere dich nicht', icon: '🎲', beschreibung: 'Bring alle Figuren ins Ziel!', maxZuege: 500 },
  wordgame:   { name: 'Wortspiel', icon: '🔤', beschreibung: 'Buchstabenkette - jedes Wort muss mit dem letzten Buchstaben beginnen!', maxZuege: 999 },
};

router.use(requireAuth);

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function pruefeSpielZugriff(req, gameType) {
  const cfg = db.prepare('SELECT * FROM game_configs WHERE game_type = ?').get(gameType);
  if (!cfg || !cfg.is_enabled) return { erlaubt: false, fehler: `Dieses Spiel ist derzeit nicht verfügbar.` };

  if (cfg.access_mode === 'all') return { erlaubt: true };

  if (cfg.access_mode === 'label') {
    const erlaubteLabels = JSON.parse(cfg.label_ids || '[]');
    const nutzerLabels = db.prepare(`
      SELECT label_id FROM nutzer_labels WHERE nutzer_id = ?
    `).all(req.user.id).map(r => r.label_id);
    const hat = nutzerLabels.some(l => erlaubteLabels.includes(l));
    if (!hat) return { erlaubt: false, fehler: 'Du hast keinen Zugriff auf dieses Spiel.' };
    return { erlaubt: true };
  }

  return { erlaubt: false, fehler: 'Dieses Spiel ist derzeit nicht verfügbar.' };
}

function holePokeProfil(req) {
  // Nutze schul-poke-profil wenn vorhanden, sonst Standard
  const nutzer = db.prepare('SELECT schul_poke_profile_id FROM users WHERE id = ?').get(req.user.id);
  if (nutzer?.schul_poke_profile_id) {
    return db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(nutzer.schul_poke_profile_id);
  }
  return db.prepare('SELECT * FROM poke_profiles WHERE ist_standard = 1 LIMIT 1').get();
}

function erstelleSpielstandFuerTyp(gameType) {
  switch (gameType) {
    case 'connect4':   return Connect4.erstelleSpielstand();
    case 'tictactoe':  return TicTacToe.erstelleSpielstand();
    case 'battleship': return Battleship.erstelleSpielstand();
    case 'ludo':       return Ludo.erstelleSpielstand();
    case 'wordgame':   return Wordgame.erstelleSpielstand();
    default: return null;
  }
}

async function sendePokeSpielnachricht(spiel, poke, nachrichtentext, buttons = []) {
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const webhookUrl = poke?.webhook_url || getSetting('poke_webhook_url');
  const apiKey = poke?.api_key || getSetting('poke_api_key');
  if (!webhookUrl || !apiKey) return;

  const moveUrl = `${appUrl}/api/webhooks/game-move/${spiel.id}/${spiel.webhook_token}`;
  let nachricht = nachrichtentext + `\n\nSpielmodus: **${SPIEL_META[spiel.game_type]?.name}**\nDein Spielzug-URL: POST ${moveUrl}`;

  const payload = { message: nachricht };
  if (buttons.length > 0) {
    // Maximal 8 Buttons, Pushover-kompatibel
    payload.buttons = buttons.slice(0, 8);
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('[Spielebereich] Fehler beim Senden der Poke-Spielnachricht:', e.message);
  }
}

// ─── GET /api/games/verfuegbar - Alle verfügbaren Spiele (für Nutzer sichtbar) ─
router.get('/verfuegbar', (req, res) => {
  const configs = db.prepare('SELECT * FROM game_configs').all();
  const spiele = configs.map(cfg => {
    const zugriff = pruefeSpielZugriff(req, cfg.game_type);
    const meta = SPIEL_META[cfg.game_type] || {};
    return {
      gameType: cfg.game_type,
      ...meta,
      istVerfuegbar: cfg.is_enabled && zugriff.erlaubt,
      isEnabled: cfg.is_enabled === 1,
    };
  });
  res.json({ spiele });
});

// ─── GET /api/games/aktiv - Aktive Spiele des Nutzers ─────────────────────────
router.get('/aktiv', (req, res) => {
  const spiele = db.prepare(`
    SELECT id, game_type, status, created_at, updated_at,
           json_extract(state, '$.amZug') as am_zug,
           json_extract(state, '$.zugAnzahl') as zug_anzahl,
           json_extract(state, '$.gewinner') as gewinner
    FROM games WHERE user_id = ? AND status = 'active'
    ORDER BY updated_at DESC
  `).all(req.user.id);

  res.json({ spiele: spiele.map(s => ({ ...s, meta: SPIEL_META[s.game_type] })) });
});

// ─── GET /api/games/:id - Spielstand laden ────────────────────────────────────
router.get('/:id', (req, res) => {
  const spiel = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!spiel) return res.status(404).json({ fehler: 'Spiel nicht gefunden.' });

  let state;
  try { state = JSON.parse(spiel.state); } catch { state = {}; }

  // Bei Schiffe versenken: Poke-Feld ohne Schiffe liefern
  if (spiel.game_type === 'battleship' && state.pokeFeld) {
    state.pokeFeldOhneSchiffe = state.pokeFeld.map(reihe => reihe.map(z => z === 1 ? 0 : z));
  }

  res.json({ spiel: { ...spiel, state, meta: SPIEL_META[spiel.game_type] } });
});

// ─── POST /api/games/starten - Neues Spiel starten ───────────────────────────
router.post('/starten', async (req, res) => {
  const { gameType } = req.body;
  if (!SPIEL_META[gameType]) return res.status(400).json({ fehler: 'Unbekannter Spieltyp.' });

  const zugriff = pruefeSpielZugriff(req, gameType);
  if (!zugriff.erlaubt) return res.status(403).json({ fehler: zugriff.fehler });

  // Nur ein aktives Spiel pro Typ erlaubt
  const bestehendes = db.prepare('SELECT id FROM games WHERE user_id = ? AND game_type = ? AND status = ?').get(req.user.id, gameType, 'active');
  if (bestehendes) return res.status(409).json({ fehler: 'Du hast bereits ein aktives Spiel dieses Typs. Beende es zuerst.', spielId: bestehendes.id });

  const initialState = erstelleSpielstandFuerTyp(gameType);
  if (!initialState) return res.status(500).json({ fehler: 'Spielstand konnte nicht erstellt werden.' });

  // Zufällig entscheiden wer anfängt, außer bei Battleship (Setup-Phase startet immer beim Nutzer)
  if (gameType !== 'battleship') {
    initialState.amZug = Math.random() > 0.5 ? 'nutzer' : 'poke';
  }

  const token = crypto.randomBytes(20).toString('hex');
  const poke = holePokeProfil(req);

  const result = db.prepare(`
    INSERT INTO games (user_id, game_type, state, status, webhook_token, poke_profile_id)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).run(req.user.id, gameType, JSON.stringify(initialState), token, poke?.id || null);

  const spiel = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user.id, 'spiel_gestartet', { spielId: spiel.id, gameType });

  // Poke über neues Spiel informieren
  const meta = SPIEL_META[gameType];
  const appUrl = getSetting('app_url') || 'http://localhost:3000';
  const moveUrl = `${appUrl}/api/webhooks/game-move/${spiel.id}/${token}`;
  
  const startText = initialState.amZug === 'nutzer' ? '**Nutzer fängt an.** Warte auf seinen Zug, dann bist du dran.' : '**DU fängst an!** Mache direkt deinen ersten Zug.';
  const pokeNachricht = `🎮 ${req.user.benutzername} möchte **${meta.name}** spielen!\n\n${meta.beschreibung}\n\nDu spielst als ${gameType === 'battleship' ? 'Verteidiger' : gameType === 'ludo' ? 'Blau 🔵' : gameType === 'connect4' ? '🟡 Gelb' : gameType === 'tictactoe' ? '⭕ Kreis' : 'Wortgeber'}.\n\n${startText}\n\nDein Spielzug-URL: POST ${moveUrl}\nBody-Format: { "zug": {...} }`;

  await sendePokeSpielnachricht(spiel, poke, pokeNachricht);

  res.json({ erfolg: true, spiel: { ...spiel, state: JSON.parse(spiel.state), meta } });
});

// ─── POST /api/games/:id/zug - Spielzug des Nutzers ─────────────────────────
router.post('/:id/zug', async (req, res) => {
  const spiel = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!spiel) return res.status(404).json({ fehler: 'Spiel nicht gefunden.' });
  if (spiel.status !== 'active') return res.status(409).json({ fehler: 'Spiel ist bereits beendet.' });

  let state;
  try { state = JSON.parse(spiel.state); } catch { return res.status(500).json({ fehler: 'Spielstand korrupt.' }); }

  if (state.amZug !== 'nutzer') return res.status(409).json({ fehler: 'Poke ist am Zug!' });

  const { zug } = req.body;
  let ergebnis;

  switch (spiel.game_type) {
    case 'connect4': {
      const spalte = parseInt(zug?.spalte);
      if (isNaN(spalte)) return res.status(400).json({ fehler: 'Zug erfordert: { spalte: 0-6 }' });
      ergebnis = Connect4.spielzugMachen(state, spalte, 'nutzer');
      break;
    }
    case 'tictactoe': {
      const feld = parseInt(zug?.feld);
      if (isNaN(feld)) return res.status(400).json({ fehler: 'Zug erfordert: { feld: 0-8 }' });
      ergebnis = TicTacToe.spielzugMachen(state, feld, 'nutzer');
      break;
    }
    case 'battleship': {
      if (state.phase === 'setup') {
        const nutzerFeld = zug?.feld;
        ergebnis = Battleship.setupAbschliessen(state, nutzerFeld);
        if (ergebnis.erfolg) {
          // Nach dem Setup bestimmen wer anfängt
          ergebnis.state.amZug = Math.random() > 0.5 ? 'nutzer' : 'poke';
        }
      } else {
        const r = parseInt(zug?.r), c = parseInt(zug?.c);
        if (isNaN(r) || isNaN(c)) return res.status(400).json({ fehler: 'Zug erfordert: { r: 0-9, c: 0-9 }' });
        ergebnis = Battleship.schiessen(state, r, c, 'nutzer');
      }
      break;
    }
    case 'ludo': {
      if (zug?.aktion === 'wuerfeln') {
        const augenzahl = Ludo.wuerfeln();
        state.letzterWurf = augenzahl;
        state.mussWuerfeln = false;
        const verfuegbar = Ludo.verfuegbareFiguren(state, 'nutzer', augenzahl);
        if (verfuegbar.length === 0) {
          // Kein gültiger Zug möglich, Poke ist dran
          state.amZug = 'poke';
          state.mussWuerfeln = true;
          state.letzterWurf = null;
        }
        db.prepare('UPDATE games SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(state), spiel.id);
        return res.json({ erfolg: true, state, augenzahl, verfuegbar });
      }
      const figurIdx = parseInt(zug?.figur);
      const augenzahl = state.letzterWurf;
      if (isNaN(figurIdx) || !augenzahl) return res.status(400).json({ fehler: 'Zug erfordert: { aktion: "wuerfeln" } oder { figur: 0-3 } nach dem Würfeln.' });
      ergebnis = Ludo.spielzugMachen(state, figurIdx, augenzahl, 'nutzer');
      break;
    }
    case 'wordgame': {
      const wort = zug?.wort;
      if (!wort) return res.status(400).json({ fehler: 'Zug erfordert: { wort: "deinwort" }' });
      ergebnis = Wordgame.wortEingeben(state, wort, 'nutzer');
      break;
    }
    default:
      return res.status(400).json({ fehler: 'Unbekannter Spieltyp.' });
  }

  if (!ergebnis.erfolg) return res.status(400).json({ fehler: ergebnis.fehler });

  const neuerState = ergebnis.state;
  const spielEnde = neuerState.gewinner !== null;
  const neuerStatus = spielEnde ? 'finished' : 'active';

  db.prepare('UPDATE games SET state = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(neuerState), neuerStatus, spiel.id);

  logAudit(req.user.id, 'spielzug', { spielId: spiel.id, gameType: spiel.game_type, spieler: 'nutzer' });

  // Poke informieren
  if (!spielEnde) {
    const poke = holePokeProfil(req);
    let pokeMsg = `🎮 ${req.user.benutzername} hat gezogen - du bist dran!\n\n`;
    let buttons = [];

    switch (spiel.game_type) {
      case 'connect4':
        pokeMsg += Connect4.brettAlsAscii(neuerState.brett);
        buttons = Connect4.pokeZugButtons();
        break;
      case 'tictactoe':
        pokeMsg += TicTacToe.brettAlsAscii(neuerState.brett);
        buttons = TicTacToe.pokeZugButtons(neuerState.brett);
        break;
      case 'battleship':
        pokeMsg += Battleship.feldAlsAsciiNutzer(neuerState.pokeFeld) + '\n\nAuf welches Feld schießt du?';
        buttons = Battleship.pokeVerfuegbareSchuesse(neuerState.nutzerFeld).slice(0, 8);
        break;
      case 'wordgame':
        pokeMsg = Wordgame.pokeNachrichtErstellen(neuerState);
        break;
    }

    await sendePokeSpielnachricht(spiel, poke, pokeMsg, buttons);
  } else {
    // Spielende melden
    const poke = holePokeProfil(req);
    const gewInhalt = neuerState.gewinner === 'nutzer' ? `${req.user.benutzername} hat gewonnen! 🏆` : 'Unentschieden! 🤝';
    await sendePokeSpielnachricht(spiel, poke, `🎮 Spiel beendet! ${gewInhalt}`);
  }

  const responseState = JSON.parse(JSON.stringify(neuerState));
  // Bei Schiffe versenken: Poke-Feld ohne Schiffe liefern (verhindert Cheat/Aufdecken)
  if (spiel.game_type === 'battleship' && responseState.pokeFeld) {
    responseState.pokeFeldOhneSchiffe = responseState.pokeFeld.map(reihe => reihe.map(z => z === 1 ? 0 : z));
    delete responseState.pokeFeld;
  }

  res.json({ erfolg: true, state: responseState, spielStatus: neuerStatus });
});

// ─── POST /api/games/:id/erinnern - Poke erinnern ──────────────────────────────
router.post('/:id/erinnern', async (req, res) => {
  const spiel = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!spiel) return res.status(404).json({ fehler: 'Spiel nicht gefunden.' });
  if (spiel.status !== 'active') return res.status(409).json({ fehler: 'Spiel ist bereits beendet.' });

  let state;
  try { state = JSON.parse(spiel.state); } catch { return res.status(500).json({ fehler: 'Spielstand korrupt.' }); }

  if (state.amZug !== 'poke') return res.status(409).json({ fehler: 'Poke ist nicht am Zug!' });

  const poke = holePokeProfil(req);
  await sendePokeSpielnachricht(spiel, poke, `🔔 ${req.user.benutzername} wartet auf deinen Zug! Bitte mach deinen nächsten Spielzug.`);
  
  res.json({ erfolg: true });
});

// ─── DELETE /api/games/:id - Spiel aufgeben ───────────────────────────────────
router.delete('/:id', (req, res) => {
  const spiel = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!spiel) return res.status(404).json({ fehler: 'Spiel nicht gefunden.' });

  db.prepare("UPDATE games SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(spiel.id);
  logAudit(req.user.id, 'spiel_aufgegeben', { spielId: spiel.id, gameType: spiel.game_type });
  res.json({ erfolg: true });
});

// ─── GET /api/games/admin/configs - Admin: Alle Spielkonfigurationen ─────────
router.get('/admin/configs', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ fehler: 'Nur für Admins.' });
  const configs = db.prepare('SELECT * FROM game_configs').all().map(c => ({
    ...c,
    label_ids: JSON.parse(c.label_ids || '[]'),
    meta: SPIEL_META[c.game_type]
  }));
  const labels = db.prepare('SELECT * FROM labels ORDER BY name').all();
  res.json({ configs, labels });
});

// ─── POST /api/games/admin/config - Admin: Spielkonfiguration aktualisieren ──
router.post('/admin/config', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ fehler: 'Nur für Admins.' });

  const { gameType, isEnabled, accessMode, labelIds } = req.body;
  if (!SPIEL_META[gameType]) return res.status(400).json({ fehler: 'Unbekannter Spieltyp.' });
  if (!['none', 'all', 'label'].includes(accessMode)) return res.status(400).json({ fehler: 'Ungültiger access_mode.' });

  db.prepare(`
    UPDATE game_configs
    SET is_enabled = ?, access_mode = ?, label_ids = ?, updated_at = CURRENT_TIMESTAMP
    WHERE game_type = ?
  `).run(isEnabled ? 1 : 0, accessMode, JSON.stringify(labelIds || []), gameType);

  logAudit(req.user.id, 'spiel_config_geaendert', { gameType, isEnabled, accessMode, labelIds });
  res.json({ erfolg: true });
});

module.exports = router;
