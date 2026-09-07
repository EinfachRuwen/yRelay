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
    // Poke-Feld wird aus der Auswahl von Poke später gesetzt
    pokeFeld: null,
    amZug: 'nutzer',
    gewinner: null,
    zugAnzahl: 0,
    letzterPokeSchuss: null,
    phase: 'setup',
  };
}

function setupAbschliessen(state, nutzerFeld) {
  if (!Array.isArray(nutzerFeld) || nutzerFeld.length !== GROESSE || !Array.isArray(nutzerFeld[0]) || nutzerFeld[0].length !== GROESSE) {
    return { erfolg: false, fehler: 'Ungültiges Spielfeld.' };
  }
  
  let schiffZellen = 0;
  for (let r = 0; r < GROESSE; r++) {
    for (let c = 0; c < GROESSE; c++) {
      if (nutzerFeld[r][c] === 1) schiffZellen++;
    }
  }
  
  if (schiffZellen !== 20) {
    return { erfolg: false, fehler: 'Falsche Anzahl an Schiffsfeldern.' };
  }

  const isPlaying = state.pokeFeld ? true : false;
  return { 
    erfolg: true, 
    state: {
      ...state,
      nutzerFeld,
      phase: isPlaying ? 'playing' : 'setup_poke',
      amZug: isPlaying ? (state.startSpieler || 'nutzer') : 'poke'
    } 
  };
}

function pokeSetupWaehlen(state, setup) {
  if (!Array.isArray(setup)) return { erfolg: false, fehler: 'Das Setup muss ein Array von Schiffen sein.' };
  
  const feld = erstelleLeeresFeld();
  const erwarteteSchiffe = {
    'Schlachtschiff': 1,
    'Kreuzer': 2,
    'Zerstörer': 3,
    'U-Boot': 4
  };
  
  const groessen = {
    'Schlachtschiff': 4,
    'Kreuzer': 3,
    'Zerstörer': 2,
    'U-Boot': 1
  };
  
  const platzierteSchiffe = {
    'Schlachtschiff': 0,
    'Kreuzer': 0,
    'Zerstörer': 0,
    'U-Boot': 0
  };

  for (const s of setup) {
    if (!erwarteteSchiffe[s.name]) return { erfolg: false, fehler: `Unbekanntes Schiff: ${s.name}` };
    if (typeof s.x !== 'number' || typeof s.y !== 'number') return { erfolg: false, fehler: `Fehlende Koordinaten (x, y) für ${s.name}` };
    if (typeof s.horizontal !== 'boolean') return { erfolg: false, fehler: `Fehlende Eigenschaft 'horizontal' (true/false) für ${s.name}` };
    
    platzierteSchiffe[s.name]++;
    if (platzierteSchiffe[s.name] > erwarteteSchiffe[s.name]) {
      return { erfolg: false, fehler: `Zu viele Schiffe vom Typ ${s.name} (Maximal ${erwarteteSchiffe[s.name]}).` };
    }
    
    const groesse = groessen[s.name];
    if (!kannPlatzieren(feld, s.y, s.x, groesse, s.horizontal)) {
      return { erfolg: false, fehler: `Das Schiff '${s.name}' auf x=${s.x}, y=${s.y} (horizontal=${s.horizontal}) ist außerhalb des Spielfelds oder überschneidet sich mit einem anderen Schiff!` };
    }
    platzieren(feld, s.y, s.x, groesse, s.horizontal);
  }
  
  for (const typ in erwarteteSchiffe) {
    if (platzierteSchiffe[typ] !== erwarteteSchiffe[typ]) {
      return { erfolg: false, fehler: `Es fehlen Schiffe vom Typ ${typ} (Erwartet: ${erwarteteSchiffe[typ]}, Platziert: ${platzierteSchiffe[typ]}).` };
    }
  }

  const isPlaying = state.nutzerFeld.flat().some(x => x === 1);
  return {
    erfolg: true,
    state: {
      ...state,
      pokeFeld: feld,
      phase: isPlaying ? 'playing' : 'setup',
      amZug: isPlaying ? (state.startSpieler || 'nutzer') : 'nutzer'
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
    amZug: treffer ? schiesser : (schiesser === 'nutzer' ? 'poke' : 'nutzer'),
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

function feldAlsAsciiPoke(pokeFeld) {
  const cols = 'ABCDEFGHIJ';
  const header = '   ' + Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2)).join('');
  const zeilen = pokeFeld.map((reihe, ri) => {
    const zellen = reihe.map(z => z === 1 ? '🚢' : '🌊');
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

module.exports = { erstelleLeeresFeld, erstelleSpielstand, setupAbschliessen, pokeSetupWaehlen, schiessen, feldAlsAsciiNutzer, feldAlsAsciiPoke, pokeZugButtons, pokeVerfuegbareSchuesse, pokeKiZug };
