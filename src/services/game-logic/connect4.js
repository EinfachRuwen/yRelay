// 4 Gewinnt - Spiellogik
'use strict';

const REIHEN = 6;
const SPALTEN = 7;

function erstelleSpielstand() {
  return {
    brett: Array(REIHEN).fill(null).map(() => Array(SPALTEN).fill(0)),
    amZug: 'nutzer', // 'nutzer' oder 'poke'
    gewinner: null,
    zugAnzahl: 0
  };
}

function spielzugMachen(state, spalte, spieler) {
  const brett = state.brett.map(r => [...r]);
  const spielerNr = spieler === 'nutzer' ? 1 : 2;

  // Unterste freie Zeile in der Spalte finden
  let reihe = -1;
  for (let r = REIHEN - 1; r >= 0; r--) {
    if (brett[r][spalte] === 0) { reihe = r; break; }
  }
  if (reihe === -1) return { erfolg: false, fehler: 'Spalte ist voll.' };

  brett[reihe][spalte] = spielerNr;
  const gewinner = pruefeGewinner(brett, reihe, spalte, spielerNr);
  const unentschieden = !gewinner && brett[0].every(z => z !== 0);

  return {
    erfolg: true,
    state: {
      brett,
      amZug: spieler === 'nutzer' ? 'poke' : 'nutzer',
      gewinner: gewinner ? spieler : (unentschieden ? 'unentschieden' : null),
      zugAnzahl: state.zugAnzahl + 1
    }
  };
}

function pruefeGewinner(brett, r, c, spieler) {
  const richtungen = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of richtungen) {
    let anzahl = 1;
    for (let i = 1; i <= 3; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= REIHEN || nc < 0 || nc >= SPALTEN || brett[nr][nc] !== spieler) break;
      anzahl++;
    }
    for (let i = 1; i <= 3; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr < 0 || nr >= REIHEN || nc < 0 || nc >= SPALTEN || brett[nr][nc] !== spieler) break;
      anzahl++;
    }
    if (anzahl >= 4) return true;
  }
  return false;
}

function brettAlsAscii(brett) {
  const symbole = { 0: '⬜', 1: '🔴', 2: '🟡' };
  const zeilen = brett.map(reihe => reihe.map(z => symbole[z]).join(''));
  zeilen.push('1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣');
  return zeilen.join('\n');
}

function pokeZugButtons() {
  return Array.from({ length: SPALTEN }, (_, i) => ({
    id: `col_${i}`,
    text: `Spalte ${i + 1}`
  }));
}

// Einfache KI für Poke falls er nicht über Webhook antwortet (Fallback)
function pokeKiZug(state) {
  // Prüfe gewinnenden Zug
  for (let s = 0; s < SPALTEN; s++) {
    const test = spielzugMachen(state, s, 'poke');
    if (test.erfolg && test.state.gewinner === 'poke') return s;
  }
  // Blockiere Gegner-Gewinn
  for (let s = 0; s < SPALTEN; s++) {
    const testState = { ...state, brett: state.brett.map(r => [...r]) };
    const test = spielzugMachen(testState, s, 'nutzer');
    if (test.erfolg && test.state.gewinner === 'nutzer') return s;
  }
  // Mitte bevorzugen
  const reihenfolge = [3, 2, 4, 1, 5, 0, 6];
  for (const s of reihenfolge) {
    const test = spielzugMachen(state, s, 'poke');
    if (test.erfolg) return s;
  }
  return 0;
}

module.exports = { erstelleSpielstand, spielzugMachen, brettAlsAscii, pokeZugButtons, pokeKiZug };
