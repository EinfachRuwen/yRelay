// Mensch ärgere dich nicht - Spiellogik (vereinfacht: 2 Spieler, keine 4-Farben-Variante)
// Nutzer = Rot, Poke = Blau. Je 4 Figuren, Startfeld-System des klassischen Spiels.
'use strict';

const FELDER = 40; // Hauptfelder im Kreis
const FIGUREN_PRO_SPIELER = 4;

// Startpositionen (wo Figuren "aufgestellt" werden)
// Nutzer (Rot) fängt bei Feld 0 an, Zielgasse: Felder 100-103
// Poke (Blau) fängt bei Feld 20 an, Zielgasse: Felder 200-203
const START = { nutzer: 0, poke: 20 };
const HAUS = { nutzer: -1, poke: -2 }; // Noch im Haus
const ZIEL = { nutzer: 100, poke: 200 }; // Zielgasse-Offset

function erstelleSpielstand() {
  return {
    // Figurenpositionen: -1/-2 = im Haus, 0-39 = Spielfeld, 100-103/200-203 = Zielgasse
    figuren: {
      nutzer: [-1, -1, -1, -1],
      poke: [-2, -2, -2, -2],
    },
    amZug: 'nutzer',
    letzterWurf: null,
    gewinner: null,
    zugAnzahl: 0,
    mussWuerfeln: true,
  };
}

function wuerfeln() {
  return Math.floor(Math.random() * 6) + 1;
}

function spielzugMachen(state, figurIdx, augenzahl, spieler) {
  const figuren = {
    nutzer: [...state.figuren.nutzer],
    poke: [...state.figuren.poke],
  };

  const pos = figuren[spieler][figurIdx];
  const hausWert = spieler === 'nutzer' ? -1 : -2;
  const startFeld = START[spieler];
  const zielOffset = ZIEL[spieler];

  // Figur aus dem Haus holen (nur mit 6)
  if (pos === hausWert) {
    if (augenzahl !== 6) return { erfolg: false, fehler: 'Zum Herausstellen wird eine 6 benötigt.' };
    // Prüfe ob eigene Figur auf Startfeld steht
    if (figuren[spieler].includes(startFeld)) return { erfolg: false, fehler: 'Eigene Figur steht auf dem Startfeld.' };
    figuren[spieler][figurIdx] = startFeld;
  } else {
    // Normale Bewegung
    let neuPos = pos + augenzahl;

    // Berechne relative Position zum eigenen Startfeld
    const relPos = ((pos - startFeld) + FELDER) % FELDER;
    const neuRelPos = relPos + augenzahl;

    if (neuRelPos >= FELDER) {
      // In die Zielgasse
      const zielPos = zielOffset + (neuRelPos - FELDER);
      if (zielPos > zielOffset + 3) return { erfolg: false, fehler: 'Zu weit.' };
      figuren[spieler][figurIdx] = zielPos;
    } else {
      neuPos = (startFeld + neuRelPos) % FELDER;
      // Gegner schlagen
      const gegner = spieler === 'nutzer' ? 'poke' : 'nutzer';
      const gegnerHaus = HAUS[gegner];
      figuren[gegner] = figuren[gegner].map(gp => gp === neuPos ? gegnerHaus : gp);
      figuren[spieler][figurIdx] = neuPos;
    }
  }

  const zielGasse = figuren[spieler].filter(p => p >= ZIEL[spieler] && p <= ZIEL[spieler] + 3);
  const gewonnen = zielGasse.length === FIGUREN_PRO_SPIELER;

  return {
    erfolg: true,
    state: {
      ...state,
      figuren,
      amZug: (augenzahl === 6 && !gewonnen) ? spieler : (spieler === 'nutzer' ? 'poke' : 'nutzer'),
      letzterWurf: null,
      gewinner: gewonnen ? spieler : null,
      zugAnzahl: state.zugAnzahl + 1,
      mussWuerfeln: true,
    }
  };
}

function verfuegbareFiguren(state, spieler, augenzahl) {
  const figuren = state.figuren[spieler];
  const hausWert = spieler === 'nutzer' ? -1 : -2;
  const startFeld = START[spieler];
  const zielOffset = ZIEL[spieler];

  return figuren.map((pos, idx) => {
    if (pos === hausWert) return augenzahl === 6 ? idx : null;
    if (pos >= zielOffset) {
      const neuZiel = pos + augenzahl;
      return neuZiel <= zielOffset + 3 ? idx : null;
    }
    return idx;
  }).filter(i => i !== null);
}

function brettAlsText(state) {
  const { nutzer, poke } = state.figuren;
  const hausWert = { nutzer: -1, poke: -2 };
  const imHaus = (sp) => state.figuren[sp].filter(p => p === hausWert[sp]).length;
  const imZiel = (sp) => state.figuren[sp].filter(p => p >= ZIEL[sp]).length;
  const aufFeld = (sp) => state.figuren[sp].filter(p => p >= 0 && p < FELDER).length;

  return `🎲 Mensch ärgere dich nicht!\n\n🔴 Rot (Du): 🏠 ${imHaus('nutzer')} | 🏃 ${aufFeld('nutzer')} | 🏁 ${imZiel('nutzer')}\n🔵 Blau (Poke): 🏠 ${imHaus('poke')} | 🏃 ${aufFeld('poke')} | 🏁 ${imZiel('poke')}\n\nPositionen: Rot: [${nutzer.join(', ')}] | Blau: [${poke.join(', ')}]`;
}

module.exports = { erstelleSpielstand, wuerfeln, spielzugMachen, verfuegbareFiguren, brettAlsText };
