// Tic Tac Toe - Spiellogik
'use strict';

function erstelleSpielstand() {
  return {
    brett: Array(9).fill(0), // 0=leer, 1=Nutzer(X), 2=Poke(O)
    amZug: 'nutzer',
    gewinner: null,
    zugAnzahl: 0
  };
}

function spielzugMachen(state, feld, spieler) {
  if (feld < 0 || feld > 8) return { erfolg: false, fehler: 'Ungültiges Feld.' };
  if (state.brett[feld] !== 0) return { erfolg: false, fehler: 'Feld ist bereits belegt.' };

  const brett = [...state.brett];
  brett[feld] = spieler === 'nutzer' ? 1 : 2;

  const gewinner = pruefeGewinner(brett);
  const unentschieden = !gewinner && brett.every(z => z !== 0);

  return {
    erfolg: true,
    state: {
      brett,
      amZug: spieler === 'nutzer' ? 'poke' : 'nutzer',
      gewinner: gewinner === 1 ? 'nutzer' : gewinner === 2 ? 'poke' : (unentschieden ? 'unentschieden' : null),
      zugAnzahl: state.zugAnzahl + 1
    }
  };
}

const GEWINNLINIEN = [
  [0,1,2], [3,4,5], [6,7,8], // Zeilen
  [0,3,6], [1,4,7], [2,5,8], // Spalten
  [0,4,8], [2,4,6]           // Diagonalen
];

function pruefeGewinner(brett) {
  for (const [a, b, c] of GEWINNLINIEN) {
    if (brett[a] !== 0 && brett[a] === brett[b] && brett[b] === brett[c]) return brett[a];
  }
  return null;
}

function brettAlsAscii(brett) {
  const sym = { 0: '⬜', 1: '❌', 2: '⭕' };
  const nummern = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
  return [
    brett.slice(0,3).map((z,i) => z === 0 ? nummern[i] : sym[z]).join(''),
    brett.slice(3,6).map((z,i) => z === 0 ? nummern[i+3] : sym[z]).join(''),
    brett.slice(6,9).map((z,i) => z === 0 ? nummern[i+6] : sym[z]).join('')
  ].join('\n');
}

function pokeZugButtons(brett) {
  const nummern = ['1','2','3','4','5','6','7','8','9'];
  return brett.map((z, i) => z === 0 ? { id: `feld_${i}`, text: nummern[i] } : null).filter(Boolean);
}

function pokeKiZug(state) {
  // Minimax (einfach, Tiefe 2)
  const brett = state.brett;
  // Gewinnzug
  for (let i = 0; i < 9; i++) {
    if (brett[i] === 0) {
      const b = [...brett]; b[i] = 2;
      if (pruefeGewinner(b) === 2) return i;
    }
  }
  // Gegner blockieren
  for (let i = 0; i < 9; i++) {
    if (brett[i] === 0) {
      const b = [...brett]; b[i] = 1;
      if (pruefeGewinner(b) === 1) return i;
    }
  }
  // Mitte, Ecken, Kanten
  const reihenfolge = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  for (const i of reihenfolge) {
    if (brett[i] === 0) return i;
  }
  return 0;
}

module.exports = { erstelleSpielstand, spielzugMachen, brettAlsAscii, pokeZugButtons, pokeKiZug };
