// Spielebereich - Frontend View mit Premium UI & Optimistic Updates
'use strict';

const GamesView = {
  _aktivesSpiel: null,
  _sseListener: null,
  _pokeTurnStart: null,
  _reminderInterval: null,
  
  // Battleship Setup State
  _bsSetup: {
    aktiv: false,
    feld: [],
    schiffe: [
      { name: 'Schlachtschiff', len: 4, anzahl: 1 },
      { name: 'Kreuzer', len: 3, anzahl: 2 },
      { name: 'Zerstörer', len: 2, anzahl: 3 },
      { name: 'U-Boot', len: 1, anzahl: 4 }
    ],
    aktuellesSchiffIdx: 0,
    aktuellesSchiffGefunden: 0,
    horizontal: true
  },

  // Ludo Koordinaten
  _ludoCoords: {
    pfad: [{"x":4,"y":10},{"x":4,"y":9},{"x":4,"y":8},{"x":4,"y":7},{"x":4,"y":6},{"x":3,"y":6},{"x":2,"y":6},{"x":1,"y":6},{"x":0,"y":6},{"x":0,"y":5},{"x":0,"y":4},{"x":1,"y":4},{"x":2,"y":4},{"x":3,"y":4},{"x":4,"y":4},{"x":4,"y":3},{"x":4,"y":2},{"x":4,"y":1},{"x":4,"y":0},{"x":5,"y":0},{"x":6,"y":0},{"x":6,"y":1},{"x":6,"y":2},{"x":6,"y":3},{"x":6,"y":4},{"x":7,"y":4},{"x":8,"y":4},{"x":9,"y":4},{"x":10,"y":4},{"x":10,"y":5},{"x":10,"y":6},{"x":9,"y":6},{"x":8,"y":6},{"x":7,"y":6},{"x":6,"y":6},{"x":6,"y":7},{"x":6,"y":8},{"x":6,"y":9},{"x":6,"y":10},{"x":5,"y":10}],
    ziele: { nutzer: [{"x":5,"y":9},{"x":5,"y":8},{"x":5,"y":7},{"x":5,"y":6}], poke: [{"x":5,"y":1},{"x":5,"y":2},{"x":5,"y":3},{"x":5,"y":4}] },
    haus: { nutzer: [{"x":1,"y":9},{"x":2,"y":9},{"x":1,"y":8},{"x":2,"y":8}], poke: [{"x":8,"y":1},{"x":9,"y":1},{"x":8,"y":2},{"x":9,"y":2}] }
  },

  _icons: { connect4: 'kreis', battleship: 'anker', tictactoe: 'raster', ludo: 'wuerfel', wordgame: 'buchstaben', akinator: 'frage' },

  rendern(nutzer) {
    return /* html */`
      <div class="seite">
        ${UI.kopf(nutzer, 'spiele')}
        <main class="inhalt spiele-inhalt">
          <div class="seitenkopf" id="spiele-kopf">
            <div>
              <h1>Spiele</h1>
              <p>Gegen den Agenten, Zug um Zug. Er antwortet, sobald er Zeit hat.</p>
            </div>
          </div>
          <div id="spiele-aktiv"></div>
          <div id="spiele-lobby" class="spiele-liste"></div>
          <div id="spiel-board" style="display:none;"></div>
        </main>
      </div>
      <style>
        .spiele-aktiv-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; margin-bottom: 28px; }
        .partie { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-2); }
        .partie .plakette { margin-top: 4px; }
        .partie .icon { width: 24px; height: 24px; color: var(--tinte-2); }
        .partie b { display: block; }
                .partie .btn { margin-left: auto; }
        .abschnitt-titel { font-size: 21px; margin-bottom: 10px; }

        /* Spielfläche */
        .spielflaeche { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
        .board-wrapper { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-2); padding: 18px 20px 22px; min-width: 0; }
        .board-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--linie); }
        .board-title { font-family: var(--schrift-eng); font-size: 28px; display: flex; align-items: center; gap: 10px; }
        .board-status { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; border-radius: var(--r-1); font-weight: 700; background: var(--orange); color: #1c1e1f; }
        .board-status.poke-zug { background: var(--flaeche-2); color: var(--tinte-2); border: 1px solid var(--linie-stark); }
        .board-status.ende { background: var(--blau); color: #fff; }
        .board-fuss { margin-top: 24px; display: flex; justify-content: center; }
        .chat-wrapper { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-2); display: flex; flex-direction: column; max-height: 720px; position: sticky; top: calc(var(--band-hoehe) + 16px); }
        .chat-wrapper h3 { font-size: 19px; padding: 14px 16px; border-bottom: 1px solid var(--linie); }
        .chat-log { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; min-height: 200px; }
        .chat-msg { max-width: 88%; font-size: 15px; line-height: 1.4; }
        .chat-msg.nutzer { align-self: flex-end; background: var(--blau); color: #fff; padding: 8px 12px; border-radius: var(--r-2) var(--r-2) 2px var(--r-2); }
        .chat-msg.poke { align-self: flex-start; padding: 2px 0 2px 12px; border-left: 4px solid var(--blau); }
        .chat-eingabe { display: flex; gap: 6px; padding: 10px; border-top: 1px solid var(--linie); background: var(--flaeche-2); }
        #btn-poke-erinnern { display: none; }

        /* Mensch ärgere dich nicht */
        .ludo-container { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
        .ludo-board { display: grid; grid-template-columns: repeat(11, 36px); grid-template-rows: repeat(11, 36px); gap: 3px; background: var(--flaeche-2); padding: 12px; border-radius: var(--r-2); border: 1px solid var(--linie); position: relative; }
        .ludo-cell { border-radius: 50%; background: var(--flaeche); border: 2px solid var(--linie-stark); position: relative; }
        .ludo-cell.pfad { background: var(--flaeche); border-color: var(--tinte-3); }
        .ludo-cell.haus-nutzer, .ludo-cell.ziel-nutzer { border-color: var(--rot); background: var(--rot-hell); }
        .ludo-cell.haus-poke, .ludo-cell.ziel-poke { border-color: var(--blau); background: var(--blau-hell); }
        .ludo-figur { width: 26px; height: 26px; border-radius: 50%; align-self: center; justify-self: center; z-index: 2; cursor: default; border: 3px solid #fff; box-shadow: 0 2px 4px var(--flaeche-2); transition: transform 300ms var(--kurve); }
        .ludo-figur.nutzer { background: var(--rot); }
        .ludo-figur.poke { background: var(--blau); }
        .ludo-figur.klickbar { cursor: pointer; outline: 3px solid var(--gelb); outline-offset: 2px; }
        .ludo-figur.klickbar:hover { transform: scale(1.12); }
        .ludo-info { flex: 1; min-width: 220px; background: var(--flaeche-2); padding: 16px; border-radius: var(--r-2); }

        /* Schiffe versenken */
        .bs-container { display: flex; gap: 28px; justify-content: center; flex-wrap: wrap; }
        .bs-field { background: var(--flaeche-2); padding: 14px; border-radius: var(--r-2); border: 1px solid var(--linie); }
        .bs-field h3 { font-size: 18px; margin-bottom: 10px; }
        .bs-grid { display: grid; grid-template-columns: repeat(11, 1fr); gap: 3px; }
        .bs-cell { width: 32px; height: 32px; border-radius: 3px; background: var(--blau-hell); border: 1px solid color-mix(in srgb, var(--blau) 25%, transparent); display: grid; place-items: center; font-size: 15px; position: relative; cursor: pointer; transition: background-color 120ms; }
        .bs-cell.header { background: none; border: 0; font-family: var(--schrift-eng); color: var(--tinte-3); cursor: default; }
        .bs-cell.schiff { background: var(--tinte-2); border-color: var(--tinte); }
        .bs-cell.treffer { background: var(--rot); border-color: var(--rot-tief); color: #fff; }
        .bs-cell.daneben { background: var(--flaeche); border-color: var(--linie); }
        .bs-cell.daneben::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--tinte-3); }
        .bs-cell.klickbar:hover { background: var(--gelb); border-color: #1c1e1f; }

        /* Vier gewinnt */
        .c4-container { background: var(--blau); padding: 16px; border-radius: var(--r-3); max-width: 480px; margin: 0 auto; position: relative; }
        .c4-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
        .c4-cell { width: 100%; aspect-ratio: 1; border-radius: 50%; background: var(--flaeche); box-shadow: inset 0 3px 0 var(--flaeche-2); position: relative; }
        .c4-chip { position: absolute; inset: 3px; border-radius: 50%; transition: transform 0.45s cubic-bezier(0.5, 0, 0.5, 1); }
        .c4-chip.nutzer { background: var(--rot); box-shadow: inset 0 0 0 4px var(--rot-tief); }
        .c4-chip.poke { background: var(--gelb); box-shadow: inset 0 0 0 4px #c9a300; }
        .c4-col { position: relative; cursor: pointer; border-radius: var(--r-2); }
        .c4-col:hover { background: var(--linie); }
        .c4-overlay { position: absolute; inset: 16px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; z-index: 10; }

        /* Tic Tac Toe */
        .ttt-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; max-width: 330px; margin: 0 auto; }
        .ttt-cell { aspect-ratio: 1; display: grid; place-items: center; font-family: var(--schrift-eng); font-size: 64px; cursor: pointer; border: 0 solid var(--tinte); background: none; }
        .ttt-cell:nth-child(-n+6) { border-bottom-width: 4px; }
        .ttt-cell:not(:nth-child(3n)) { border-right-width: 4px; }
        .ttt-cell:hover:not(.belegt) { background: var(--flaeche-2); }
        .ttt-cell.nutzer { color: var(--rot); }
        .ttt-cell.poke { color: var(--blau); }

        /* Wortspiel & Wer bin ich */
        .word-chat { display: flex; flex-direction: column; gap: 10px; background: var(--flaeche-2); padding: 16px; border-radius: var(--r-2); max-height: 420px; overflow-y: auto; }
        .word-bubble { padding: 8px 14px; border-radius: var(--r-2); max-width: 80%; font-size: 18px; font-weight: 700; }
        .word-bubble.nutzer { align-self: flex-end; background: var(--blau); color: #fff; }
        .word-bubble.poke { align-self: flex-start; background: var(--flaeche); border: 1px solid var(--linie-stark); }
        .word-hint { text-align: center; color: var(--tinte-2); margin-top: 14px; font-weight: 700; }
        .word-input-container { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }
        .word-input { flex: 1; min-width: 200px; }

        @media (max-width: 980px) {
          .spielflaeche { grid-template-columns: minmax(0, 1fr); }
          .chat-wrapper { position: static; max-height: 480px; }
        }
        @media (max-width: 560px) {
          .ludo-board { grid-template-columns: repeat(11, 26px); grid-template-rows: repeat(11, 26px); gap: 2px; padding: 8px; }
          .ludo-figur { width: 20px; height: 20px; border-width: 2px; }
          .bs-cell { width: 26px; height: 26px; font-size: 12px; }
          .board-wrapper { padding: 14px; }
        }
      </style>
    `;
  },

  async initialisieren(nutzer) {
    this._nutzer = nutzer;
    await this.spieleLaden();
  },

  async spieleLaden() {
    const [verfuegbar, aktiv] = await Promise.all([
      API.anfrage('GET', '/games/verfuegbar?_t=' + Date.now()),
      API.anfrage('GET', '/games/aktiv?_t=' + Date.now())
    ]);
    this._renderLobby(verfuegbar.spiele || []);
    this._renderAktiveSpiele(aktiv.spiele || []);
  },

  _renderLobby(spiele) {
    const container = document.getElementById('spiele-lobby');
    if (!container) return;
    const frei = spiele.filter(s => s.istVerfuegbar);
    if (!frei.length) { container.innerHTML = UI.leereListeHtml('spiele', 'Ruwen hat gerade keine Spiele freigegeben.', 'Keine Spiele'); return; }
    container.innerHTML = frei.map(s => `
      <button type="button" class="spiel-eintrag" onclick="GamesView._zeigeStarterAuswahl('${s.gameType}')">
        <span class="zeichen">${UI.icon(this._icons[s.gameType] || 'spiele')}</span>
        <span><h3>${UI.escapeHtml(s.name || s.gameType)}</h3><p>${UI.escapeHtml(s.beschreibung || '')}</p></span>
        ${UI.icon('weiter')}
      </button>
    `).join('');
  },

  _renderAktiveSpiele(spiele) {
    const container = document.getElementById('spiele-aktiv');
    if (!container) return;
    if (!spiele.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <h2 class="abschnitt-titel">Laufende Partien</h2>
      <div class="spiele-aktiv-liste">
        ${spiele.map(s => `
          <div class="partie ${s.am_zug === 'nutzer' ? 'dran' : ''}">
            ${UI.icon(this._icons[s.game_type] || 'spiele')}
            <div><b>${UI.escapeHtml(s.meta?.name || s.game_type)}</b>${s.am_zug === 'nutzer' ? '<span class="plakette plakette-orange">Du bist dran</span>' : '<span class="plakette">Agent ist dran</span>'}</div>
            <button class="btn btn-primaer btn-klein" onclick="GamesView._spielOeffnen(${s.id})">Weiterspielen</button>
          </div>
        `).join('')}
      </div>
      <h2 class="abschnitt-titel">Neue Partie</h2>
    `;
  },

  async _spielStarten(gameType, starter = 'nutzer', bonusErlaubt = false, geheimesWort = '') {
    try {
      const result = await API.anfrage('POST', '/games/starten', { gameType, starter, bonusErlaubt, geheimesWort });
      UI.erfolg('Partie gestartet.');
      await this._spielOeffnen(result.spiel.id);
    } catch (e) {
      if (e.message.includes('bereits ein aktives Spiel')) {
        const data = JSON.parse(e.message.split('\n')[1] || '{}');
        if (data.spielId) await this._spielOeffnen(data.spielId);
      } else { UI.fehler(e.message); }
    }
  },

  _zeigeStarterAuswahl(gameType) {
    // Falls Akinator, benötigen wir noch extra Inputs:
    const isAkinator = gameType === 'akinator';
    
    const extraHtml = isAkinator ? `
      <div class="plan-feld" style="margin-top:18px;">
        <div class="formular-gruppe" id="aki-wort-container">
          <label class="formular-label" for="aki-wort">Dein geheimes Wort</label>
          <input type="text" id="aki-wort" class="formular-eingabe" placeholder="Nur nötig, wenn der Agent rät">
        </div>
        <label class="checkbox-label"><input type="checkbox" id="aki-bonus"> Bonusfragen erlauben (mehr als 20 Fragen)</label>
      </div>
    ` : '';

    const labelIch = isAkinator ? 'Ich rate' : 'Ich fange an';
    const labelPoke = isAkinator ? 'Agent rät' : 'Agent fängt an';

    const html = `
      ${UI.modalKopf('Wer fängt an?')}
      <div class="modal-koerper">
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
          <button class="btn btn-primaer btn-gross" onclick="GamesView._starteMitAnimation('${gameType}', 'nutzer')">${UI.icon('nutzer')}${labelIch}</button>
          <button class="btn btn-sekundaer btn-gross" onclick="GamesView._starteMitAnimation('${gameType}', 'poke')">${UI.icon('agent')}${labelPoke}</button>
          <button class="btn btn-sekundaer btn-gross" onclick="GamesView._starteMitAnimation('${gameType}', 'zufall')">${UI.icon('wuerfel')}Zufall</button>
        </div>
        ${extraHtml}
        <div id="zufall-animation-container" style="display:none; margin-top:24px; text-align:center;">
          <div id="zufall-box" style="width:72px; height:72px; border-radius:var(--r-2); background:var(--blau); color:#fff; margin:0 auto; display:grid; place-items:center; font-family:var(--schrift-eng); font-size:30px; transition: transform 0.1s;">?</div>
          <div id="zufall-text" style="margin-top:12px; font-weight:700; font-size:18px;">Wird ausgelost …</div>
        </div>
      </div>
    `;

    UI.modalZeigen(html);

    if (isAkinator) {
      // Wenn Poke rät, braucht man das Input-Feld für das Wort. 
      // Das klären wir dann beim Klick.
    }
  },

  _starteMitAnimation(gameType, auswahl) {
    let geheimesWort = '';
    let bonusErlaubt = false;
    if (gameType === 'akinator') {
      const wortInput = document.getElementById('aki-wort');
      const bonusInput = document.getElementById('aki-bonus');
      if (wortInput) geheimesWort = wortInput.value.trim();
      if (bonusInput) bonusErlaubt = bonusInput.checked;
      
      if ((auswahl === 'poke' || auswahl === 'zufall') && !geheimesWort) {
        // Falls Poke raten soll, braucht man das Wort! (Beim Zufall geben wir es vorsichtshalber an)
        UI.fehler('Gib ein geheimes Wort ein – falls der Agent raten muss.');
        return;
      }
    }

    if (auswahl !== 'zufall') {
      UI.modalSchliessen();
      this._spielStarten(gameType, auswahl, bonusErlaubt, geheimesWort);
      return;
    }

    // Animation abspielen
    const animContainer = document.getElementById('zufall-animation-container');
    const box = document.getElementById('zufall-box');
    const txt = document.getElementById('zufall-text');
    if (!animContainer || !box || !txt) return;

    animContainer.style.display = 'block';
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const isNutzer = counter % 2 === 0;
      box.textContent = isNutzer ? 'Du' : 'KI';
      box.style.transform = `scale(${counter % 2 ? 1.06 : 1})`;
      box.style.background = isNutzer ? 'var(--rot)' : 'var(--blau)';
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const winner = Math.random() > 0.5 ? 'nutzer' : 'poke';
      const isNutzer = winner === 'nutzer';
      box.textContent = isNutzer ? 'Du' : 'KI';
      box.style.transform = 'scale(1.15)';
      box.style.background = isNutzer ? 'var(--rot)' : 'var(--blau)';
      txt.textContent = isNutzer ? 'Du fängst an.' : 'Der Agent fängt an.';
      
      setTimeout(() => {
        UI.modalSchliessen();
        this._spielStarten(gameType, winner, bonusErlaubt, geheimesWort);
      }, 1500);
    }, 2000);
  },

  async _spielOeffnen(spielId) {
    document.getElementById('spiel-board').style.display = 'block';
    document.getElementById('spiele-lobby').style.display = 'none';
    document.getElementById('spiele-aktiv').style.display = 'none';
    
    // Reset Setup State for Battleship
    this._bsSetup.aktiv = false;
    this._bsSetup.feld = Array(10).fill(null).map(() => Array(10).fill(0));
    this._bsSetup.aktuellesSchiffIdx = 0;
    this._bsSetup.aktuellesSchiffGefunden = 0;
    
    await this._spielLaden(spielId);
    this._starteSseListener(spielId);
  },

  _starteSseListener(spielId) {
    if (this._pollingInterval) clearInterval(this._pollingInterval);
    this._pollingInterval = setInterval(async () => {
      if (this._aktivesSpiel?.id === spielId) {
        try {
          const daten = await API.anfrage('GET', `/games/${spielId}`);
          if (daten.spiel.status !== this._aktivesSpiel.status ||
              JSON.stringify(daten.spiel.state.zugAnzahl) !== JSON.stringify(this._aktivesSpiel.state?.zugAnzahl) ||
              JSON.stringify(daten.spiel.state.chat) !== JSON.stringify(this._aktivesSpiel.state?.chat)) {
            this._aktivesSpiel = daten.spiel;
            this._spielBoardRendern();
          }
        } catch (e) {}
      }
    }, 2500);
  },

  async _spielLaden(spielId) {
    try {
      const daten = await API.anfrage('GET', `/games/${spielId}`);
      this._aktivesSpiel = daten.spiel;
      this._spielBoardRendern();
    } catch (e) { UI.fehler('Laden fehlgeschlagen.'); }
  },

  _spielBoardRendern() {
    const spiel = this._aktivesSpiel;
    const container = document.getElementById('spiel-board');
    if (!container || !spiel) return;

    const state = spiel.state;
    const meta = spiel.meta || {};
    const istAktiv = spiel.status === 'active';
    const nutzerAmZug = state.amZug === 'nutzer' && istAktiv;

    // Reminder Timer Logic
    if (istAktiv && state.amZug === 'poke') {
      if (!this._pokeTurnStart) this._pokeTurnStart = Date.now();
    } else {
      this._pokeTurnStart = null;
    }
    this._updateReminderButton(spiel.id);

    const statusText = !istAktiv
      ? (state.gewinner === 'nutzer' ? `${UI.icon('krone')}Gewonnen` : state.gewinner === 'poke' ? 'Verloren' : 'Unentschieden')
      : nutzerAmZug ? 'Du bist dran' : `${UI.icon('warten')}Agent überlegt`;
    const statusKlasse = !istAktiv ? 'ende' : nutzerAmZug ? '' : 'poke-zug';

    let boardHtml = '';
    if (spiel.game_type === 'connect4') boardHtml = this._renderConnect4(state, nutzerAmZug);
    else if (spiel.game_type === 'tictactoe') boardHtml = this._renderTicTacToe(state, nutzerAmZug);
    else if (spiel.game_type === 'battleship') boardHtml = this._renderBattleship(state, nutzerAmZug);
    else if (spiel.game_type === 'ludo') boardHtml = this._renderLudo(state, nutzerAmZug);
    else if (spiel.game_type === 'wordgame') boardHtml = this._renderWordgame(state, nutzerAmZug);
    else if (spiel.game_type === 'akinator') boardHtml = this._renderAkinator(state, nutzerAmZug);

    // Chat Log HTML
    let chatHtml = '';
    if (state.chat && state.chat.length > 0) {
      chatHtml = state.chat.map(m => `<div class="chat-msg ${m.absender}">${UI.escapeHtml(m.text)}</div>`).join('');
    } else {
      chatHtml = `<p class="leise" style="text-align:center; margin-top:16px;">Noch nichts geschrieben.</p>`;
    }

    container.innerHTML = `
      <button class="btn btn-ghost btn-klein" style="margin:-8px 0 12px -8px;" onclick="GamesView._zurueck()">${UI.icon('zurueck')}Alle Spiele</button>
      <div class="spielflaeche">
        <div class="board-wrapper">
          <div class="board-header">
            <div class="board-title">
              ${UI.escapeHtml(meta.name || spiel.game_type)}
              <button class="btn btn-ghost btn-klein btn-icon" onclick="GamesView._zeigeRegeln('${spiel.game_type}')" title="Spielregeln" aria-label="Spielregeln">${UI.icon('info')}</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button id="btn-poke-erinnern" class="btn btn-sekundaer btn-klein" onclick="GamesView._pokeErinnern(${spiel.id})">${UI.icon('glocke')}Erinnern</button>
              <span class="board-status ${statusKlasse}">${statusText}</span>
            </div>
          </div>
          ${boardHtml}
          <div class="board-fuss">
            ${istAktiv ? `<button class="btn btn-gefahr btn-klein" onclick="GamesView._aufgeben(${spiel.id})">${UI.icon('flagge')}Aufgeben</button>` : `<button class="btn btn-primaer btn-gross" onclick="GamesView._spielStarten('${spiel.game_type}')">Noch eine Partie</button>`}
          </div>
        </div>
        <div class="chat-wrapper">
          <h3>Spiel-Chat</h3>
          <div class="chat-log" id="game-chat-log">${chatHtml}</div>
          <div class="chat-eingabe">
            <label class="sr-only" for="game-chat-input">Nachricht</label>
            <input type="text" id="game-chat-input" class="formular-eingabe" placeholder="Schreib dem Agenten …" onkeydown="if(event.key==='Enter') GamesView._sendChat()">
            <button class="btn btn-primaer btn-icon" onclick="GamesView._sendChat()" aria-label="Senden">${UI.icon('senden')}</button>
          </div>
        </div>
      </div>
    `;

    this._updateReminderButton(spiel.id);
    
    // Scroll chat to bottom
    setTimeout(() => {
      const chatLog = document.getElementById('game-chat-log');
      if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }, 0);
  },

  _sendChat() {
    const input = document.getElementById('game-chat-input');
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    
    // Optimistic Chat
    const chatLog = document.getElementById('game-chat-log');
    if (chatLog) {
      chatLog.insertAdjacentHTML('beforeend', `<div class="chat-msg nutzer">${UI.escapeHtml(msg)}</div>`);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    this._macheZug({ aktion: 'chat', nachricht: msg });
  },

  _zeigeRegeln(gameType) {
    let titel = '';
    let text = '';
    
    // Globale CSS-Klassen für die Regeln (werden ins Modal injiziert)
    const ruleStyles = '';

    switch (gameType) {
      case 'connect4':
        titel = '4 Gewinnt – Strategie & Schwerkraft';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Tauche ein in den absoluten Strategie-Klassiker! Dein Ziel ist es, als erster Spieler <span class="rule-highlight">vier eigene Chips</span> in eine ununterbrochene Linie zu bringen.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Das Spielbrett besteht aus 7 Spalten und 6 Reihen.</li>
              <li>Du spielst abwechselnd mit Poke. Klicke auf eine Spalte, um deinen Chip fallen zu lassen.</li>
              <li>Chips fallen immer bis zum untersten freien Feld der Spalte durch.</li>
              <li>Die Vierer-Reihe darf <strong>horizontal, vertikal oder diagonal</strong> sein!</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>Tipp:</strong> Achte nicht nur auf deine eigenen Linien, sondern blockiere Poke rechtzeitig! Oft gewinnt derjenige, der den Gegner in eine Falle lockt.
          </div>
        `;
        break;
      case 'tictactoe':
        titel = '⭕ Tic Tac Toe – Schnell & Taktisch';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Der zeitlose Kampf zwischen Kreuz (✕) und Kreis (◯). Wer zuerst <span class="rule-highlight">drei Symbole in einer Reihe</span> hat, gewinnt das Duell!</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Gespielt wird auf einem 3x3 Raster.</li>
              <li>Du und Poke setzt abwechselnd eure Symbole auf freie Felder.</li>
              <li>Die Reihe kann horizontal, vertikal oder diagonal verlaufen.</li>
              <li>Sind alle 9 Felder belegt und niemand hat drei in einer Reihe, endet das Spiel unentschieden.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>Tipp:</strong> Die Mitte ist das mächtigste Feld. Wenn du startest, sichere sie dir!
          </div>
        `;
        break;
      case 'ludo':
        titel = 'Mensch ärgere dich nicht – Nervenkitzel pur!';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Ein Rennen um die Welt! Bringe als Erster alle deine <span class="rule-highlight">vier Spielfiguren</span> sicher in dein Zielfeld.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Würfeln:</strong> Ihr seid abwechselnd dran. Klicke auf "Würfeln", um deine Zahl zu bestimmen.</li>
              <li><strong>Herauskommen:</strong> Du brauchst eine <strong>6</strong>, um eine Figur aus dem Haus auf das Startfeld zu setzen! Danach darfst du <strong>direkt nochmal würfeln</strong>.</li>
              <li><strong>Bewegen:</strong> Klicke auf eine leuchtende Figur, um sie um die gewürfelte Augenzahl vorzurücken.</li>
              <li><strong>Schlagen:</strong> Landest du genau auf einem Feld, auf dem Poke steht? Bam! Seine Figur wird zurück ins Haus geschickt (und umgekehrt!).</li>
              <li><strong>Blockaden:</strong> Du kannst nicht auf ein Feld ziehen, das bereits von deiner eigenen Figur besetzt ist.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>Tipp:</strong> Ärgere dich nicht, wenn du kurz vor dem Ziel geschlagen wirst – Rache ist süß!
          </div>
        `;
        break;
      case 'battleship':
        titel = 'Schiffe versenken – Die große Seeschlacht';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Spiele Admiral! Finde und <span class="rule-highlight">versenke die gesamte Flotte</span> von Poke, bevor er deine Schiffe auf den Grund des Ozeans schickt.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Die Aufstellung:</strong> Zuerst platzierst du deine Flotte heimlich auf deinem Raster. Poke wählt zeitgleich sein Setup.</li>
              <li><strong>Das Feuergefecht:</strong> Schießt abwechselnd auf die Koordinaten des gegnerischen Feldes.</li>
              <li><strong>Wasser (Fehlschuss):</strong> Du hast nichts getroffen. Poke ist dran.</li>
              <li><strong>Treffer:</strong> Du hast ein Schiff erwischt! <strong>Und jetzt kommt das Beste: Du darfst direkt noch einmal schießen!</strong> Das gilt so lange, bis du Wasser triffst.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>Tipp:</strong> Schiffe können horizontal oder vertikal liegen. Wenn du triffst, schieße im nächsten Zug auf die angrenzenden Felder!
          </div>
        `;
        break;
      case 'wordgame':
        titel = 'Wortspiel – Der ultimative Buchstabensalat';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Beweise deinen gigantischen Wortschatz in einer endlosen Kette aus Wörtern!</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Der Startspieler nennt ein beliebiges Wort.</li>
              <li>Der nächste Spieler muss nun ein Wort bilden, das <strong>mit dem letzten Buchstaben</strong> des vorherigen Wortes beginnt.</li>
              <li><em>Beispiel:</em> Apfe<strong>l</strong> → <strong>L</strong>oc<strong>h</strong> → <strong>H</strong>au<strong>s</strong> → <strong>S</strong>and.</li>
              <li>Kein Wort darf doppelt genannt werden!</li>
              <li>Wem nichts mehr einfällt, der verliert.</li>
            </ul>
          </div>
        `;
        break;
      case 'akinator':
        titel = 'Wer bin ich? (Akinator) – Mindgames';
        text = `
          <div class="rule-section">
            <div class="rule-title">Das Spielziel</div>
            <div class="rule-text">Bist du ein Gedankenleser? Ein Spieler denkt sich ein Wort aus, der andere muss es mit gezielten Fragen <span class="rule-highlight">erraten</span>.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Die Rollen:</strong> Zu Beginn wählt ihr, wer sich das Wort ausdenkt (Wortgeber) und wer rät (Rater).</li>
              <li><strong>Die Fragen:</strong> Der Rater darf bis zu 20 Fragen stellen.</li>
              <li><strong>Die Antworten:</strong> Der Wortgeber darf nur mit <em>Ja, Nein, Ich weiß nicht, Wahrscheinlich ja, Wahrscheinlich nicht</em> oder <em>Überspringen</em> antworten.</li>
              <li><strong>Die Auflösung:</strong> Der Rater kann jederzeit auf "Auflösen" klicken und seinen finalen Tipp abgeben.</li>
              <li><strong>Das Urteil:</strong> Am Ende stimmen beide Spieler ab, ob das erratene Wort richtig war (Synonyme gelten!). Sind beide sich einig, gewinnt der Rater.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>Tipp:</strong> Fange mit ganz groben Kategorien an (Tier? Gegenstand? Ort?) und werde dann Schritt für Schritt spezifischer!
          </div>
        `;
        break;
    }
    UI.modalZeigen(UI.modalKopf(titel) + '<div class="modal-koerper">' + text + '</div>');
  },

  // ---------------- LUDO ----------------
  _renderLudo(state, nutzerAmZug) {
    const { pfad, ziele, haus } = this._ludoCoords;
    let gridHtml = '';

    // Rendere leere Felder
    pfad.forEach(p => {
      gridHtml += `<div class="ludo-cell pfad" style="grid-column:${p.x+1}; grid-row:${p.y+1};"></div>`;
    });
    haus.nutzer.forEach(p => gridHtml += `<div class="ludo-cell haus-nutzer" style="grid-column:${p.x+1}; grid-row:${p.y+1};"></div>`);
    haus.poke.forEach(p => gridHtml += `<div class="ludo-cell haus-poke" style="grid-column:${p.x+1}; grid-row:${p.y+1};"></div>`);
    ziele.nutzer.forEach(p => gridHtml += `<div class="ludo-cell ziel-nutzer" style="grid-column:${p.x+1}; grid-row:${p.y+1};"></div>`);
    ziele.poke.forEach(p => gridHtml += `<div class="ludo-cell ziel-poke" style="grid-column:${p.x+1}; grid-row:${p.y+1};"></div>`);

    // Rendere Figuren
    const renderFiguren = (spieler, posArray) => {
      posArray.forEach((pos, i) => {
        let coord;
        if (pos === -1 || pos === -2) coord = haus[spieler][i]; // Im Haus
        else if (pos >= 100 && pos < 200) coord = ziele.nutzer[pos - 100]; // Ziel Nutzer
        else if (pos >= 200) coord = ziele.poke[pos - 200]; // Ziel Poke
        else coord = pfad[pos]; // Auf Feld

        if (coord) {
          // Prüfe, ob Figur klickbar ist (Nutzer am Zug, hat gewürfelt, Zug legal)
          let klickbar = false;
          if (nutzerAmZug && spieler === 'nutzer' && !state.mussWuerfeln) {
            // Grobe Client-Prüfung für Klickbarkeit (wird vom Backend validiert)
            if (pos === -1 && state.letzterWurf === 6) klickbar = true;
            if (pos >= 0) klickbar = true;
          }
          const onClick = klickbar ? `onclick="GamesView._macheZug({figur: ${i}})"` : '';
          gridHtml += `<div class="ludo-figur ${spieler} ${klickbar ? 'klickbar' : ''}" style="grid-column:${coord.x+1}; grid-row:${coord.y+1};" ${onClick}></div>`;
        }
      });
    };
    renderFiguren('nutzer', state.figuren.nutzer);
    renderFiguren('poke', state.figuren.poke);

    const wuerfelBtn = (nutzerAmZug && state.mussWuerfeln && !state.gewinner) 
      ? `<button class="btn btn-primaer btn-gross" onclick="GamesView._macheZug({aktion: 'wuerfeln'})">${UI.icon('wuerfel')}Würfeln</button>` 
      : '';

    return `
      <div class="ludo-container">
        <div class="ludo-board">${gridHtml}</div>
        <div class="ludo-info">
          <div style="margin-bottom:12px; display:flex; align-items:baseline; gap:10px;"><strong>Letzter Wurf</strong> <span class="zahl" style="font-size:40px; line-height:1;">${state.letzterWurf || '–'}</span></div>
          ${wuerfelBtn}
          <div style="margin-top:20px; font-size:0.9rem; color:var(--text-sekundaer);">
            Würfeln, dann eine markierte rote Figur antippen.
          </div>
        </div>
      </div>
    `;
  },

  // ---------------- BATTLESHIP ----------------
  _renderBattleship(state, nutzerAmZug) {
    if (state.phase === 'setup') return this._renderBattleshipSetup();
    if (state.phase === 'setup_poke') {
      return `
        <div style="text-align:center; padding: 40px;">
          <div class="lade-spinner"></div>
          <h3 style="font-size:22px;">Der Agent stellt seine Flotte auf</h3>
          <p class="text-gedaempft">Gleich geht es los.</p>
        </div>
      `;
    }

    const renderGrid = (feld, isPoke, klickbar) => {
      const cols = 'ABCDEFGHIJ';
      let html = ['','1','2','3','4','5','6','7','8','9','10'].map(h => `<div class="bs-cell header">${h}</div>`).join('');
      feld.forEach((reihe, r) => {
        html += `<div class="bs-cell header">${cols[r]}</div>`;
        reihe.forEach((z, c) => {
          let cls = 'bs-cell wasser';
          if (z === 1) cls = 'bs-cell schiff'; // Wird bei Poke via API gefiltert, also nie 1 sichtbar
          if (z === 2) cls = 'bs-cell treffer';
          if (z === 3) cls = 'bs-cell daneben';
          if (klickbar && z !== 2 && z !== 3) cls += ' klickbar';
          
          const onClick = (klickbar && z !== 2 && z !== 3) ? `onclick="GamesView._optimisticBs(${r}, ${c})"` : '';
          html += `<div class="${cls}" id="bs-${isPoke?'poke':'nutzer'}-${r}-${c}" ${onClick}>${z===2?'×':''}</div>`;
        });
      });
      return html;
    };

    return `
      <div class="bs-container">
        <div class="bs-field">
          <h3>Gegnerisches Feld</h3>
          <div class="bs-grid">${renderGrid(state.pokeFeldOhneSchiffe || state.pokeFeld, true, nutzerAmZug)}</div>
        </div>
        <div class="bs-field">
          <h3>Deine Flotte</h3>
          <div class="bs-grid">${renderGrid(state.nutzerFeld, false, false)}</div>
        </div>
      </div>
    `;
  },

  _renderBattleshipSetup() {
    this._bsSetup.aktiv = true;
    const s = this._bsSetup;
    const currSchiff = s.schiffe[s.aktuellesSchiffIdx];
    
    let html = ['','1','2','3','4','5','6','7','8','9','10'].map(h => `<div class="bs-cell header">${h}</div>`).join('');
    const cols = 'ABCDEFGHIJ';
    s.feld.forEach((reihe, r) => {
      html += `<div class="bs-cell header">${cols[r]}</div>`;
      reihe.forEach((z, c) => {
        const cls = z === 1 ? 'bs-cell schiff' : 'bs-cell wasser klickbar';
        html += `<div class="${cls}" onclick="GamesView._bsSetupPlatzieren(${r}, ${c})"></div>`;
      });
    });

    const info = currSchiff 
      ? `Platziere: <strong>${currSchiff.name}</strong> (${currSchiff.len} Felder) - noch ${currSchiff.anzahl - s.aktuellesSchiffGefunden} übrig` 
      : `<span style="color:var(--gruen); font-weight:700;">Alle Schiffe platziert.</span>`;

    return `
      <div style="text-align:center; max-width: 600px; margin: 0 auto;">
        <h3 style="margin-bottom:10px;">Flotten-Setup</h3>
        <p style="margin-bottom:20px; color:var(--text-sekundaer);">${info}</p>
        
        ${currSchiff ? `
          <button class="btn btn-sekundaer" style="margin-bottom:20px;" onclick="GamesView._bsSetupRotate()">
            Ausrichtung: ${s.horizontal ? 'waagerecht' : 'senkrecht'} – zum Drehen tippen
          </button>
        ` : ''}

        <div class="bs-field" style="display:inline-block; margin-bottom:20px;">
          <div class="bs-grid" id="bs-setup-grid">${html}</div>
        </div>

        <div>
          ${!currSchiff ? `<button class="btn btn-primaer"  onclick="GamesView._bsSetupFertig()">Flotte bestätigen</button>` : ''}
          <button class="btn btn-ghost" onclick="GamesView._spielOeffnen(GamesView._aktivesSpiel.id)">Neu aufstellen</button>
        </div>
      </div>
    `;
  },

  _bsSetupRotate() {
    this._bsSetup.horizontal = !this._bsSetup.horizontal;
    this._spielBoardRendern();
  },

  _bsSetupPlatzieren(r, c) {
    const s = this._bsSetup;
    const currSchiff = s.schiffe[s.aktuellesSchiffIdx];
    if (!currSchiff) return;

    // Check bounds & collision
    const len = currSchiff.len;
    for (let i = 0; i < len; i++) {
      const nr = s.horizontal ? r : r + i;
      const nc = s.horizontal ? c + i : c;
      if (nr >= 10 || nc >= 10 || s.feld[nr][nc] === 1) {
        UI.fehler('Ungültige Platzierung!');
        return;
      }
    }

    // Place
    for (let i = 0; i < len; i++) {
      const nr = s.horizontal ? r : r + i;
      const nc = s.horizontal ? c + i : c;
      s.feld[nr][nc] = 1;
    }

    s.aktuellesSchiffGefunden++;
    if (s.aktuellesSchiffGefunden >= currSchiff.anzahl) {
      s.aktuellesSchiffGefunden = 0;
      s.aktuellesSchiffIdx++;
    }

    this._spielBoardRendern();
  },

  _bsSetupFertig() {
    this._macheZug({ aktion: 'setup', feld: this._bsSetup.feld });
  },

  _optimisticBs(r, c) {
    const cell = document.getElementById(`bs-poke-${r}-${c}`);
    if (cell) {
      cell.className = 'bs-cell';
      cell.innerHTML = '<div class="lade-spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    }
    this._macheZug({ r, c });
  },

  // ---------------- CONNECT 4 ----------------
  _renderConnect4(state, nutzerAmZug) {
    let gridHtml = '';
    for (let r = 0; r < state.brett.length; r++) {
      for (let c = 0; c < state.brett[r].length; c++) {
        const val = state.brett[r][c];
        const cls = val === 1 ? 'nutzer' : val === 2 ? 'poke' : '';
        gridHtml += `<div class="c4-cell"><div class="c4-chip ${cls}" id="c4-chip-${r}-${c}"></div></div>`;
      }
    }

    let overlayCols = '';
    for (let c = 0; c < 7; c++) {
      const klickbar = nutzerAmZug && !state.gewinner;
      const onClick = klickbar ? `onclick="GamesView._optimisticC4(${c})"` : '';
      overlayCols += `<div class="c4-col" ${onClick}></div>`;
    }

    return `
      <div class="c4-container">
        <div class="c4-grid">${gridHtml}</div>
        <div class="c4-overlay">${overlayCols}</div>
      </div>
    `;
  },

  _optimisticC4(c) {
    const state = this._aktivesSpiel.state;
    // Find empty row
    for (let r = state.brett.length - 1; r >= 0; r--) {
      if (state.brett[r][c] === 0) {
        const chip = document.getElementById(`c4-chip-${r}-${c}`);
        if (chip) {
          chip.className = 'c4-chip nutzer';
          chip.style.transform = `translateY(-${(r+1)*60}px)`; // Start high
          requestAnimationFrame(() => {
            chip.style.transform = 'translateY(0)';
          });
        }
        break;
      }
    }
    this._macheZug({ spalte: c });
  },

  // ---------------- TIC TAC TOE ----------------
  _renderTicTacToe(state, nutzerAmZug) {
    const sym = { 0: '', 1: '✕', 2: '◯' };
    const kl = { 0: '', 1: 'nutzer belegt', 2: 'poke belegt' };
    let gridHtml = '';
    state.brett.forEach((v, i) => {
      const onClick = (v === 0 && nutzerAmZug && !state.gewinner) ? `onclick="GamesView._optimisticTtt(${i})"` : '';
      gridHtml += `<div class="ttt-cell ${kl[v]}" id="ttt-cell-${i}" ${onClick}>${sym[v]}</div>`;
    });
    return `<div class="ttt-container">${gridHtml}</div>`;
  },

  _optimisticTtt(i) {
    const cell = document.getElementById(`ttt-cell-${i}`);
    if (cell) {
      cell.className = 'ttt-cell nutzer belegt';
      cell.textContent = '✕';
    }
    this._macheZug({ feld: i });
  },

  // ---------------- WORDGAME ----------------
  _renderWordgame(state, nutzerAmZug) {
    const bubs = state.woerter.map((w, i) => {
      const startsFirst = (state.amZug === 'nutzer' && state.woerter.length % 2 === 0) || (state.amZug === 'poke' && state.woerter.length % 2 !== 0);
      const cls = startsFirst ? (i % 2 === 0 ? 'nutzer' : 'poke') : (i % 2 === 0 ? 'poke' : 'nutzer');
      return `<div class="word-bubble ${cls}">${UI.escapeHtml(w)}</div>`;
    }).join('');

    const hint = state.letzterBuchstabe 
      ? `Dein nächstes Wort muss mit <strong>${state.letzterBuchstabe.toUpperCase()}</strong> beginnen!` 
      : 'Beginne mit einem beliebigen Wort!';

    const input = (nutzerAmZug && !state.gewinner) ? `
      <div class="word-input-container">
        <input type="text" id="word-input" class="word-input" placeholder="Tippe dein Wort hier..." autocomplete="off" onkeydown="if(event.key==='Enter') GamesView._submitWord()">
        <button class="btn btn-primaer" onclick="GamesView._submitWord()">Senden</button>
      </div>
    ` : '';

    return `
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="word-chat" id="word-chat-container">
          ${bubs || '<p style="text-align:center; color:var(--text-sekundaer);">Noch keine Wörter gefallen.</p>'}
          ${(state.amZug === 'poke' && !state.gewinner) ? `<div class="word-bubble poke" style="opacity:0.7;"><em>Poke tippt...</em></div>` : ''}
        </div>
        ${!state.gewinner ? `<div class="word-hint">${hint}</div>` : ''}
        ${input}
      </div>
    `;
  },

  _submitWord() {
    const input = document.getElementById('word-input');
    const wort = input?.value?.trim();
    if (!wort) return;
    input.value = '';
    
    // Optimistic UI
    const container = document.getElementById('word-chat-container');
    if (container) {
      container.insertAdjacentHTML('beforeend', `<div class="word-bubble nutzer">${UI.escapeHtml(wort)}</div>`);
      container.scrollTop = container.scrollHeight;
    }
    
    this._macheZug({ wort });
  },

  // ---------------- AKINATOR ----------------
  _renderAkinator(state, nutzerAmZug) {
    if (state.phase === 'wort_auswahl') {
      return `
        <div style="text-align:center; padding: 40px 20px;">
          <span class="leere-liste-icon">${UI.icon('frage')}</span>
          <h3 style="margin-bottom: 15px; color: var(--text-primaer);">Warte auf Poke...</h3>
          <p style="color: var(--text-sekundaer); max-width: 400px; margin: 0 auto; line-height: 1.5;">
            Poke überlegt sich gerade ein kreatives Wort (Tier, Gegenstand, Person etc.), das du gleich erraten musst. 
            Sobald Poke sein Wort festlegt, geht das Spiel automatisch los!
          </p>
          <div class="loader" style="margin: 30px auto;"></div>
        </div>
      `;
    }

    if (state.phase === 'fragen') {
      const isNutzerRater = state.rater === 'nutzer';
      const maxFragen = state.bonusErlaubt ? '∞' : 20;
      const count = state.fragen.filter(f => f.typ === 'antwort' && f.text.toLowerCase() !== 'überspringen').length;
      
      const bubs = state.fragen.map(f => {
        const cls = f.absender === 'nutzer' ? 'nutzer' : 'poke';
        const prefix = f.typ === 'loesung' ? 'Lösung: ' : '';
        return `<div class="word-bubble ${cls}"><strong>${prefix}${UI.escapeHtml(f.text)}</strong></div>`;
      }).join('');

      let interaktion = '';
      if (nutzerAmZug) {
        if (isNutzerRater) {
          interaktion = `
            <div class="word-input-container" style="flex-direction:column; gap:10px;">
              <div style="display:flex; gap:10px;">
                <input type="text" id="aki-frage" class="word-input" placeholder="Ja/Nein Frage stellen..." onkeydown="if(event.key==='Enter') GamesView._akiMacheZug({frage: this.value})">
                <button class="btn btn-primaer" onclick="GamesView._akiMacheZug({frage: document.getElementById('aki-frage').value})">Fragen</button>
              </div>
              <div style="display:flex; gap:10px; margin-top:10px;">
                <input type="text" id="aki-loesen" class="word-input" placeholder="Wort direkt erraten..." onkeydown="if(event.key==='Enter') GamesView._akiMacheZug({aktion: 'loesen', wort: this.value})">
                <button class="btn btn-notfall" onclick="GamesView._akiMacheZug({aktion: 'loesen', wort: document.getElementById('aki-loesen').value})">Auflösen!</button>
              </div>
              <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn btn-sekundaer" style="width:100%;" onclick="GamesView._akiMacheZug({aktion: 'tipp'})">💡 Tipp von Poke anfordern</button>
              </div>
            </div>
          `;
        } else {
          interaktion = `
            <div style="text-align:center; font-weight:bold; margin-bottom:10px;">Dein Wort: <span style="color:var(--blau);">${UI.escapeHtml(state.wort)}</span></div>
            <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
              ${['Ja', 'Nein', 'Ich weiß nicht', 'Wahrscheinlich ja', 'Wahrscheinlich nicht', 'Überspringen'].map(a => 
                `<button class="btn btn-sekundaer btn-klein" onclick="GamesView._macheZug({antwort: '${a}'})">${a}</button>`
              ).join('')}
            </div>
          `;
        }
      }

      return `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align:center; margin-bottom:10px; color:var(--text-sekundaer);">Frage ${count} / ${maxFragen}</div>
          <div class="word-chat" id="aki-chat-container">
            ${bubs || '<p style="text-align:center; color:var(--text-sekundaer);">Noch keine Fragen gestellt.</p>'}
            ${(state.amZug === 'poke') ? `<div class="word-bubble poke" style="opacity:0.7;"><em>Poke tippt...</em></div>` : ''}
          </div>
          <div style="margin-top:20px;">
            ${interaktion}
          </div>
        </div>
      `;
    }

    if (state.phase === 'voting') {
      const myVote = state.voting.nutzer;
      const loesung = state.fragen.find(f => f.typ === 'loesung')?.loesungswort || 'Nicht aufgelöst';
      return `
        <div style="max-width: 500px; margin: 0 auto; text-align:center; padding:30px; background:var(--flaeche-2); border-radius:var(--r-2);">
          <h2 style="margin-bottom:10px;">Die Auflösung!</h2>
          <p style="font-size:1.2rem;">Geratenes Wort: <strong style="color:var(--blau);">${UI.escapeHtml(loesung)}</strong></p>
          <p style="font-size:1.2rem; margin-bottom:30px;">Echtes Wort: <strong style="color:var(--tinte);">${UI.escapeHtml(state.wort)}</strong></p>
          
          <h4 style="margin-bottom:15px;">Stimmen diese Wörter in etwa überein?</h4>
          ${myVote === null ? `
            <div style="display:flex; gap:20px; justify-content:center;">
              <button class="btn btn-erfolg btn-gross" onclick="GamesView._macheZug({aktion: 'abstimmen', zustimmung: true})">Ja, passt!</button>
              <button class="btn btn-notfall btn-gross" onclick="GamesView._macheZug({aktion: 'abstimmen', zustimmung: false})">Nein</button>
            </div>
          ` : `
            <div style="color:var(--text-sekundaer);">Du hast abgestimmt. Warte auf Poke...</div>
          `}
        </div>
      `;
    }
    
    return ''; // Fallback, falls die Phase nicht erkannt wird (vermeidet 'undefined' im UI)
  },

  _akiMacheZug(zug) {
    if (zug.frage) zug.frage = zug.frage.trim();
    if (zug.wort) zug.wort = zug.wort.trim();
    if (!zug.frage && !zug.wort) return;
    this._macheZug(zug);
  },

  // ---------------- GENERAL ----------------
  async _macheZug(zug) {
    try {
      const board = document.getElementById('spiel-board');
      if (board) board.style.pointerEvents = 'none';

      const spielId = this._aktivesSpiel.id;
      const result = await API.anfrage('POST', `/games/${spielId}/zug`, { zug });
      
      this._aktivesSpiel = { ...this._aktivesSpiel, state: result.state, status: result.spielStatus };
      this._spielBoardRendern();
      if (result.warnung) UI.fehler(result.warnung);

      if (result.spielStatus === 'finished') {
        clearInterval(this._pollingInterval);
        await this.spieleLaden();
      }
    } catch (e) {
      UI.fehler(e.message);
      this._spielBoardRendern(); 
    } finally {
      const board = document.getElementById('spiel-board');
      if (board) board.style.pointerEvents = 'auto';
    }
  },

  async _aufgeben(spielId) {
    if (!confirm('Wirklich aufgeben?')) return;
    try {
      await API.anfrage('DELETE', `/games/${spielId}`);
      clearInterval(this._pollingInterval);
      this._zurueck();
    } catch (e) { UI.fehler(e.message); }
  },

  _zurueck() {
    clearInterval(this._pollingInterval);
    if (this._reminderInterval) clearInterval(this._reminderInterval);
    document.getElementById('spiel-board').style.display = 'none';
    document.getElementById('spiele-lobby').style.display = 'grid';
    document.getElementById('spiele-aktiv').style.display = 'block';
    this._aktivesSpiel = null;
    this.spieleLaden();
  },

  // ─── ERINNERUNGS-BUTTON LOGIK ──────────────────────────────────────────────
  _updateReminderButton(spielId) {
    if (!this._aktivesSpiel || this._aktivesSpiel.id !== spielId) return;
    const btn = document.getElementById('btn-poke-erinnern');
    if (!btn) return;
    if (this._pokeTurnStart) {
      const waitTime = (Date.now() - this._pokeTurnStart) / 1000;
      if (waitTime >= 30) {
        btn.style.display = 'block';
      } else {
        btn.style.display = 'none';
        setTimeout(() => this._updateReminderButton(spielId), 1000);
      }
    } else {
      btn.style.display = 'none';
    }
  },

  async _pokeErinnern(spielId) {
    const btn = document.getElementById('btn-poke-erinnern');
    if (btn) btn.disabled = true;
    try {
      await API.anfrage('POST', `/webhooks/game-move/${spielId}/erinnerung`);
      UI.erfolg('Erinnerung gesendet!');
      this._pokeTurnStart = Date.now();
      this._updateReminderButton(spielId);
    } catch (e) {
      UI.fehler('Erinnerung fehlgeschlagen: ' + e.message);
    }
    if (btn) btn.disabled = false;
  },

  zerstoeren() {
    clearInterval(this._pollingInterval);
    clearInterval(this._reminderInterval);
    if (this._sseListener) this._sseListener.close();
  }
};
