// Schiffe versenken - Spiellogik
'use strict';

const GROESSE = 10;
const SCHIFFE = [
  { name: 'Schlachtschiff', groesse: 4, anzahl: 1 },
  { name: 'Kreuzer', groesse: 3, anzahl: 2 },
  { name: 'Zerstörer', groesse: 2, anzahl: 3 },
  { name: 'U-Boot', groesse: 1, anzahl: 4 }
];

function erstelleLeeresFeld() {
  return Array(GROESSE).fill(null).map(() => Array(GROESSE).fill(0));
  // 0=leer, 1=Schiff, 2=Treffer, 3=Wasser
}

function platzierungZufaellig() {
  const feld = erstelleLeeresFeld();
  for (const schiff of SCHIFFE) {
    for (let n = 0; n < schiff.anzahl; n++) {
      let platziert = false;
      while (!platziert) {
        const horizontal = Math.random() > 0.5;
        const r = Math.floor(Math.random() * GROESSE);
        const c = Math.floor(Math.random() * GROESSE);
        if (kannPlatzieren(feld, r, c, schiff.groesse, horizontal)) {
          platzieren(feld, r, c, schiff.groesse, horizontal);
          platziert = true;
        }
      }
    }
  }
  return feld;
}

function kannPlatzieren(feld, r, c, groesse, horizontal) {
  for (let i = 0; i < groesse; i++) {
    const nr = horizontal ? r : r + i;
    const nc = horizontal ? c + i : c;
    if (nr >= GROESSE || nc >= GROESSE || feld[nr][nc] !== 0) return false;
  }
  return true;
}

function platzieren(feld, r, c, groesse, horizontal) {
  for (let i = 0; i < groesse; i++) {
    const nr = horizontal ? r : r + i;
    const nc = horizontal ? c + i : c;
    feld[nr][nc] = 1;
  }
}

function erstelleSpielstand() {
  return {
    // Nutzer-Feld fängt leer an, muss im Setup platziert werden
    nutzerFeld: erstelleLeeresFeld(),
    // Poke-Feld wird sofort zufällig generiert
    pokeFeld: platzierungZufaellig(),
    amZug: 'nutzer',
    gewinner: null,
    zugAnzahl: 0,
    letzterPokeSchuss: null,
    phase: 'setup',
  };
}

function setupAbschliessen(state, nutzerFeld) {
  // Überprüfen, ob das übergebene Feld gültig ist (einfache Prüfung, ob es ein 10x10 Array ist)
  if (!Array.isArray(nutzerFeld) || nutzerFeld.length !== GROESSE || !Array.isArray(nutzerFeld[0]) || nutzerFeld[0].length !== GROESSE) {
    return { erfolg: false, fehler: 'Ungültiges Spielfeld.' };
  }
  
  // Zähle Schiffe um zumindest grob zu prüfen
  let schiffZellen = 0;
  for (let r = 0; r < GROESSE; r++) {
    for (let c = 0; c < GROESSE; c++) {
      if (nutzerFeld[r][c] === 1) schiffZellen++;
    }
  }
  
  if (schiffZellen !== 20) { // 4 + 3+3 + 2+2+2 + 1+1+1+1 = 20
    return { erfolg: false, fehler: 'Falsche Anzahl an Schiffsfeldern.' };
  }

  return { 
    erfolg: true, 
    state: {
      ...state,
      nutzerFeld,
      phase: 'playing'
    } 
  };
}

function schiessen(state, r, c, schiesser) {
  if (r < 0 || r >= GROESSE || c < 0 || c >= GROESSE) return { erfolg: false, fehler: 'Ungültige Koordinate.' };

  const zielFeld = schiesser === 'nutzer' ? 'pokeFeld' : 'nutzerFeld';
  const feld = state[zielFeld].map(zeile => [...zeile]);

  if (feld[r][c] === 2 || feld[r][c] === 3) return { erfolg: false, fehler: 'Dort wurde schon geschossen.' };

  const treffer = feld[r][c] === 1;
  feld[r][c] = treffer ? 2 : 3;

  const alleVersenkt = feld.flat().every(z => z !== 1);

  const neuerState = {
    ...state,
    [zielFeld]: feld,
    amZug: schiesser === 'nutzer' ? 'poke' : 'nutzer',
    gewinner: alleVersenkt ? schiesser : null,
    zugAnzahl: state.zugAnzahl + 1,
  };

  if (schiesser === 'poke') {
    neuerState.letzterPokeSchuss = { r, c, treffer };
  }

  return { erfolg: true, treffer, state: neuerState };
}

function feldAlsAsciiNutzer(pokeFeld) {
  // Zeigt dem Nutzer das Poke-Feld (ohne Schiffsposition, nur Treffer/Wasser)
  const cols = 'ABCDEFGHIJ';
  const header = '   ' + Array.from({ length: GROESSE }, (_, i) => String(i + 1).padStart(2)).join('');
  const zeilen = pokeFeld.map((reihe, ri) => {
    const zellen = reihe.map(z => z === 2 ? '💥' : z === 3 ? '🌊' : '⬜');
    return `${cols[ri]}  ${zellen.join('')}`;
  });
  return header + '\n' + zeilen.join('\n');
}

function pokeZugButtons() {
  const cols = 'ABCDEFGHIJ';
  const buttons = [];
  for (let r = 0; r < GROESSE; r++) {
    for (let c = 0; c < GROESSE; c++) {
      buttons.push({ id: `shot_${r}_${c}`, text: `${cols[r]}${c + 1}` });
    }
  }
  return buttons;
}

function pokeVerfuegbareSchuesse(nutzerFeld) {
  // Nur Felder zurückgeben auf die Poke noch schießen kann
  const cols = 'ABCDEFGHIJ';
  const buttons = [];
  for (let r = 0; r < GROESSE; r++) {
    for (let c = 0; c < GROESSE; c++) {
      if (nutzerFeld[r][c] === 0 || nutzerFeld[r][c] === 1) {
        buttons.push({ id: `shot_${r}_${c}`, text: `${cols[r]}${c + 1}` });
      }
    }
  }
  return buttons;
}

function pokeKiZug(state) {
  // Zufälliger freier Schuss
  const frei = [];
  for (let r = 0; r < GROESSE; r++) {
    for (let c = 0; c < GROESSE; c++) {
      if (state.nutzerFeld[r][c] === 0 || state.nutzerFeld[r][c] === 1) frei.push([r, c]);
    }
  }
  if (frei.length === 0) return [0, 0];
  return frei[Math.floor(Math.random() * frei.length)];
}

module.exports = { erstelleLeeresFeld, erstelleSpielstand, setupAbschliessen, schiessen, feldAlsAsciiNutzer, pokeZugButtons, pokeVerfuegbareSchuesse, pokeKiZug };
