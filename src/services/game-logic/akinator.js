// Akinator (Wer bin ich?) - Spiellogik
'use strict';

const ANTWORTEN = ['Ja', 'Nein', 'Ich weiß nicht', 'Wahrscheinlich ja', 'Wahrscheinlich nicht', 'Überspringen'];
const MAX_FRAGEN = 20;

function erstelleSpielstand() {
  return {
    phase: 'setup', // setup -> fragen -> voting
    amZug: 'nutzer', // Beginnt beim Nutzer fürs Setup
    wort: null,
    wortGeber: null, // 'nutzer' oder 'poke'
    rater: null, // 'poke' oder 'nutzer'
    fragen: [], // { absender: 'rater', text: '...', typ: 'frage' | 'antwort' }
    bonusErlaubt: false,
    fragenGeknackt: false, // Sobald das Wort erraten wird oder MAX erreicht ist
    voting: { nutzer: null, poke: null },
    gewinner: null,
    letzteFrage: null,
    zugAnzahl: 0,
  };
}

function spielzugMachen(state, zug, spieler) {
  // Phase 1: Setup
  if (state.phase === 'setup') {
    if (spieler !== 'nutzer') return { erfolg: false, fehler: 'Nur der Nutzer kann das Setup abschließen.' };
    
    if (!zug.wort || !zug.wortGeber || typeof zug.bonusErlaubt === 'undefined') {
      return { erfolg: false, fehler: 'Setup unvollständig. Brauche wort, wortGeber und bonusErlaubt.' };
    }

    const wortGeber = zug.wortGeber;
    const rater = wortGeber === 'nutzer' ? 'poke' : 'nutzer';

    return {
      erfolg: true,
      state: {
        ...state,
        phase: 'fragen',
        wort: zug.wort,
        wortGeber,
        rater,
        bonusErlaubt: zug.bonusErlaubt,
        amZug: rater // Der Rater fängt an, die erste Frage zu stellen
      }
    };
  }

  // Phase 2: Fragen & Raten
  if (state.phase === 'fragen') {
    // Rater stellt Frage oder löst auf
    if (spieler === state.rater) {
      if (zug.aktion === 'loesen') {
        if (!zug.wort) return { erfolg: false, fehler: 'Kein Lösungswort übergeben.' };
        return {
          erfolg: true,
          state: {
            ...state,
            phase: 'voting',
            amZug: 'nutzer', // Nutzer stimmt zuerst ab
            fragen: [...state.fragen, { absender: spieler, text: `Lösung: ${zug.wort}`, typ: 'loesung', loesungswort: zug.wort }]
          }
        };
      } else {
        if (!zug.frage) return { erfolg: false, fehler: 'Keine Frage übergeben.' };
        return {
          erfolg: true,
          state: {
            ...state,
            amZug: state.wortGeber,
            letzteFrage: zug.frage,
            fragen: [...state.fragen, { absender: spieler, text: zug.frage, typ: 'frage' }]
          }
        };
      }
    }
    
    // Wortgeber antwortet
    if (spieler === state.wortGeber) {
      if (!zug.antwort) return { erfolg: false, fehler: 'Keine Antwort übergeben.' };
      
      const glatt = zug.antwort.toLowerCase();
      // Poke sendet manchmal Freitext, wir versuchen das zu matchen oder nehmen es an
      const antwortGefunden = ANTWORTEN.find(a => a.toLowerCase() === glatt) || zug.antwort;
      
      const neueFragen = [...state.fragen, { absender: spieler, text: antwortGefunden, typ: 'antwort' }];
      
      const gueltigeFragenCount = neueFragen.filter(f => f.typ === 'antwort' && f.text.toLowerCase() !== 'überspringen').length;
      
      if (gueltigeFragenCount >= MAX_FRAGEN && !state.bonusErlaubt) {
        // Zwanghaft auflösen
        return {
          erfolg: true,
          state: {
            ...state,
            fragen: neueFragen,
            phase: 'voting',
            amZug: 'nutzer',
            gewinner: state.wortGeber // Wenn Rater es nicht schafft, gewinnt Wortgeber
          }
        };
      }
      
      return {
        erfolg: true,
        state: {
          ...state,
          fragen: neueFragen,
          letzteFrage: null,
          amZug: state.rater
        }
      };
    }
  }

  // Phase 3: Voting (Ist das Lösungswort nah genug am echten Wort?)
  if (state.phase === 'voting') {
    if (zug.aktion !== 'abstimmen' || typeof zug.zustimmung !== 'boolean') {
      return { erfolg: false, fehler: 'Abstimmung ungültig.' };
    }
    
    const voting = { ...state.voting, [spieler]: zug.zustimmung };
    const amZug = spieler === 'nutzer' ? 'poke' : 'nutzer';
    
    // Wenn beide abgestimmt haben
    if (voting.nutzer !== null && voting.poke !== null) {
      const beideDafuer = voting.nutzer && voting.poke;
      return {
        erfolg: true,
        state: {
          ...state,
          voting,
          gewinner: beideDafuer ? state.rater : state.wortGeber,
          amZug: null // Spielende
        }
      };
    }
    
    return { erfolg: true, state: { ...state, voting, amZug } };
  }

  return { erfolg: false, fehler: 'Ungültiger Zustand oder Zug.' };
}

function pokeNachrichtErstellen(state) {
  let msg = `🧞 Wer bin ich? - Dein Zug!\n\n`;

  if (state.phase === 'setup') {
    return msg + `Der Nutzer bereitet das Spiel vor. Du musst noch warten.`; // Sollte eigentlich nicht vorkommen
  }

  if (state.phase === 'fragen') {
    if (state.amZug === state.rater) {
      msg += `Du musst das Wort erraten! Das geheime Wort kennst du nicht.\nBisherige Antworten:\n`;
      const verlauf = state.fragen.map(f => `${f.absender === 'poke' ? 'Du' : 'Nutzer'}: ${f.text}`).join('\n');
      msg += verlauf ? verlauf : '(Noch keine Fragen gestellt)';
      msg += `\n\nStelle eine Ja/Nein-Frage. Sende: { "zug": { "frage": "Ist es ein Tier?" } } oder löse auf mit { "zug": { "aktion": "loesen", "wort": "Hund" } }`;
      return msg;
    } else {
      msg += `Du kennst das geheime Wort: **${state.wort}**\nDer Nutzer fragt: "${state.letzteFrage}"\n`;
      msg += `Antworte wahrheitsgemäß! Erlaubt: ${ANTWORTEN.join(', ')}.\nSende: { "zug": { "antwort": "Ja" } }`;
      return msg;
    }
  }

  if (state.phase === 'voting') {
    const loesung = state.fragen.find(f => f.typ === 'loesung')?.loesungswort || 'Unbekannt';
    msg += `Das geratene Wort war: **${loesung}**.\nDein echtes Wort ist: **${state.wort}**.\n`;
    msg += `Bewerte, ob der Nutzer recht hatte (auch bei Synonymen oder kleinen Rechtschreibfehlern)!\nSende { "zug": { "aktion": "abstimmen", "zustimmung": true/false } }`;
    return msg;
  }

  return msg;
}

module.exports = { erstelleSpielstand, spielzugMachen, pokeNachrichtErstellen };
