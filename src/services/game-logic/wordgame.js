// Wortspiel (Buchstabenkette) - Spiellogik
// Regel: Jeder muss ein Wort nennen, das mit dem letzten Buchstaben des vorherigen Wortes beginnt.
'use strict';

function erstelleSpielstand() {
  return {
    woerter: [],       // Alle genutzten Wörter
    letzterBuchstabe: null, // Buchstabe mit dem das nächste Wort beginnen muss
    amZug: 'nutzer',
    gewinner: null,
    zugAnzahl: 0,
  };
}

function wortEingeben(state, wort, spieler) {
  if (!wort || typeof wort !== 'string') return { erfolg: false, fehler: 'Kein Wort angegeben.' };

  const normalisiert = wort.trim().toLowerCase().replace(/[^a-zäöüß]/g, '');
  if (normalisiert.length < 2) return { erfolg: false, fehler: 'Das Wort muss mindestens 2 Buchstaben haben.' };

  // Prüfe ob Wort schon benutzt wurde
  if (state.woerter.includes(normalisiert)) {
    return { erfolg: false, fehler: `"${normalisiert}" wurde bereits benutzt!` };
  }

  // Prüfe ob Wort mit dem richtigen Buchstaben beginnt
  if (state.letzterBuchstabe && normalisiert[0] !== state.letzterBuchstabe) {
    return { erfolg: false, fehler: `Das Wort muss mit "${state.letzterBuchstabe.toUpperCase()}" beginnen!` };
  }

  const letzterBuchstabe = normalisiert[normalisiert.length - 1];

  return {
    erfolg: true,
    state: {
      woerter: [...state.woerter, normalisiert],
      letzterBuchstabe,
      amZug: spieler === 'nutzer' ? 'poke' : 'nutzer',
      gewinner: null,
      zugAnzahl: state.zugAnzahl + 1,
    }
  };
}

function aufgebenVerarbeiten(state, spieler) {
  return {
    ...state,
    gewinner: spieler === 'nutzer' ? 'poke' : 'nutzer',
  };
}

// Poke kann kein echtes Wörterbuch nutzen, daher sendet er einfach ein Wort via Texteingabe
// Die Buttons sind hier "Buchstaben"-Hints oder eine freie Texteingabe-Aufforderung
function pokeNachrichtErstellen(state, websiteMode = false) {
  const letztes = state.woerter[state.woerter.length - 1];
  const anfangsBuchstabe = state.letzterBuchstabe?.toUpperCase();
  const anweisung = websiteMode
    ? 'Gib dein Wort in das Wortfeld auf der Spielseite ein und sende den Spielzug dort ab.'
    : '**WICHTIG:** Antworte nicht mit normalem Text! Sende eine HTTP POST Anfrage an deine Spielzug-URL mit diesem exakten Body (ersetze "deinwort" mit deinem gewählten Wort):\n```json\n{ "zug": { "wort": "deinwort" } }\n```';
  return `🔤 Wortspiel - Du bist dran!\n\nLetztes Wort: **${letztes || '(noch keins)'}**\nDein Wort muss mit **${anfangsBuchstabe || 'einem beliebigen Buchstaben'}** beginnen.\n\nAlle bisherigen Wörter: ${state.woerter.join(', ') || 'Noch keine.'}\n\n${anweisung}`;
}

module.exports = { erstelleSpielstand, wortEingeben, aufgebenVerarbeiten, pokeNachrichtErstellen };
