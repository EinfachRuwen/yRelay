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

  rendern(nutzer) {
    return /* html */`
      <div class="seite-wrapper">
        <nav class="navbar">
          <span class="navbar-logo" style="cursor:pointer;user-select:none;" onclick="window.location.hash='#dashboard'">
            <span class="logo-y">y</span><span class="logo-relay">Relay</span>
          </span>
          <div class="navbar-nav">
            <div class="nav-nutzer">
              <div class="nav-avatar">${UI.escapeHtml((nutzer.benutzername || 'U').charAt(0).toUpperCase())}</div>
              <div class="nav-info"><span class="nav-name">${UI.escapeHtml(nutzer.benutzername)}</span></div>
            </div>
            <button class="btn btn-sekundaer btn-klein" onclick="window.location.hash='#dashboard'">📊 Dashboard</button>
            ${nutzer.has_schul_access ? `<button class="btn btn-ghost btn-klein" onclick="window.location.hash='#schuldashboard'">🎒 Schule</button>` : ''}
            ${nutzer.rolle === 'admin' ? `<button class="btn btn-ghost btn-klein" onclick="window.location.hash='#admin'">🛠️ Admin</button>` : ''}
            <button class="btn btn-ghost btn-klein" id="abmelden-btn">Abmelden</button>
          </div>
        </nav>
        <main class="hauptinhalt spiele-inhalt">
          <div class="sektion-titel" style="margin-bottom:8px;">🎮 Spiele-Arcade</div>
          <p style="color:var(--text-sekundaer);margin-bottom:28px;">Forder Poke heraus. Ein Premium-Erlebnis direkt im Browser.</p>

          <div id="spiele-lobby" class="spiele-lobby"></div>
          <div id="spiele-aktiv" style="margin-top:28px;"></div>
          <div id="spiel-board" style="display:none; animation: fadeIn 0.3s;"></div>
        </main>
      </div>
      <style>
        .spiele-inhalt { max-width: 1200px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Lobby */
        .spiele-lobby { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .spiel-karte {
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 20px;
          padding: 24px; cursor: pointer; transition: all 0.3s cubic-bezier(0.2,0,0,1);
          position: relative; overflow: hidden;
        }
        .spiel-karte::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.1), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .spiel-karte:hover::before { opacity: 1; }
        .spiel-karte:hover { transform: translateY(-5px); border-color: rgba(99,102,241,0.5); box-shadow: 0 10px 40px rgba(99,102,241,0.2); }
        .spiel-icon { font-size: 3.5rem; margin-bottom: 16px; display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3)); }
        
        /* Board Header */
        .board-wrapper { max-width: 900px; margin: 0 auto; background: rgba(15, 23, 42, 0.5); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.05); }
        .board-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .board-title { font-size:1.8rem; font-weight:800; letter-spacing: -0.5px; background: linear-gradient(to right, #a855f7, #6366f1); -webkit-background-clip: text; color: transparent; }
        .board-status { font-size:1rem; padding:8px 20px; border-radius:999px; background:rgba(99,102,241,0.15); color:#818cf8; font-weight: 600; box-shadow: 0 4px 15px rgba(99,102,241,0.1); transition: all 0.3s; }
        .board-status.poke-zug { background:rgba(245,158,11,0.15); color:#f59e0b; box-shadow: 0 4px 15px rgba(245,158,11,0.1); }
        
        /* Reminder Button */
        #btn-reminder { margin-top: 10px; border-radius: 999px; font-weight: bold; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: white; display: none; }
        #btn-reminder:disabled { background: rgba(255,255,255,0.1); color: var(--text-sekundaer); cursor: not-allowed; }

        /* Ludo (Mensch ärgere dich nicht) Premium Grid */
        .ludo-container { display: flex; gap: 30px; align-items: flex-start; }
        .ludo-board { 
          display: grid; grid-template-columns: repeat(11, 40px); grid-template-rows: repeat(11, 40px); gap: 4px;
          background: rgba(0,0,0,0.2); padding: 16px; border-radius: 20px; box-shadow: inset 0 2px 20px rgba(0,0,0,0.5);
        }
        .ludo-cell { border-radius: 50%; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); position: relative; }
        .ludo-cell.pfad { background: rgba(255,255,255,0.1); }
        .ludo-cell.haus-nutzer { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); }
        .ludo-cell.haus-poke { border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.1); }
        .ludo-cell.ziel-nutzer { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); }
        .ludo-cell.ziel-poke { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.5); }
        
        .ludo-figur {
          width: 30px; height: 30px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 10; cursor: pointer;
        }
        .ludo-figur.nutzer { background: linear-gradient(135deg, #ef4444, #991b1b); }
        .ludo-figur.poke { background: linear-gradient(135deg, #3b82f6, #1e3a8a); }
        .ludo-figur.klickbar { animation: pulseFigur 1.5s infinite; }
        .ludo-figur.klickbar:hover { transform: translate(-50%, -50%) scale(1.2); }
        @keyframes pulseFigur { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); } 70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }

        /* Battleship Premium */
        .bs-container { display: flex; gap: 40px; justify-content: center; flex-wrap: wrap; }
        .bs-field { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .bs-grid { display: grid; grid-template-columns: repeat(11, 1fr); gap: 4px; }
        .bs-cell { width: 36px; height: 36px; border-radius: 6px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.2s; position: relative; overflow: hidden; cursor: pointer; }
        .bs-cell.header { background: none; border: none; font-weight: bold; color: var(--text-sekundaer); font-size: 0.9rem; cursor: default; }
        .bs-cell.wasser { background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.3); }
        .bs-cell.wasser::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle, rgba(255,255,255,0.1) 10%, transparent 10%); background-size: 4px 4px; opacity: 0.5; }
        .bs-cell.schiff { background: linear-gradient(135deg, #475569, #1e293b); box-shadow: inset 0 2px 4px rgba(255,255,255,0.1); border-color: #0f172a; }
        .bs-cell.treffer { background: linear-gradient(135deg, #ef4444, #991b1b); border-color: #7f1d1d; animation: shake 0.5s; }
        .bs-cell.daneben { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); opacity: 0.7; }
        .bs-cell.klickbar:hover { background: rgba(56, 189, 248, 0.3); transform: scale(1.05); z-index: 2; box-shadow: 0 4px 12px rgba(56,189,248,0.4); }
        @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-3px);} 75% {transform: translateX(3px);} }
        
        /* Connect 4 Premium */
        .c4-container { background: linear-gradient(180deg, #1e3a8a, #172554); padding: 24px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.1); max-width: 500px; margin: 0 auto; }
        .c4-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
        .c4-cell { width: 100%; aspect-ratio: 1; border-radius: 50%; background: #0f172a; box-shadow: inset 0 4px 10px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.1); position: relative; }
        .c4-chip { position: absolute; inset: 4px; border-radius: 50%; box-shadow: inset 0 -4px 8px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.5s cubic-bezier(0.5, 0, 0.5, 1); }
        .c4-chip.nutzer { background: radial-gradient(circle at 30% 30%, #fca5a5, #ef4444 60%, #991b1b); }
        .c4-chip.poke { background: radial-gradient(circle at 30% 30%, #fcd34d, #f59e0b 60%, #b45309); }
        .c4-col-btn { background: transparent; border: none; padding: 10px 0; color: white; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .c4-col:hover .c4-col-btn { opacity: 1; transform: translateY(-5px); }

        /* Tic Tac Toe Premium */
        .ttt-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 320px; margin: 0 auto; }
        .ttt-cell { aspect-ratio: 1; background: rgba(255,255,255,0.02); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 4rem; cursor: pointer; transition: all 0.3s; border: 2px solid rgba(255,255,255,0.05); }
        .ttt-cell:hover:not(.belegt) { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); box-shadow: 0 0 20px rgba(99,102,241,0.2); }
        .ttt-cell.nutzer { color: #ef4444; text-shadow: 0 0 20px rgba(239,68,68,0.5); }
        .ttt-cell.poke { color: #3b82f6; text-shadow: 0 0 20px rgba(59,130,246,0.5); }

        /* Wordgame Premium */
        .word-chat { display: flex; flex-direction: column; gap: 16px; background: rgba(0,0,0,0.2); padding: 24px; border-radius: 20px; max-height: 400px; overflow-y: auto; }
        .word-bubble { padding: 12px 20px; border-radius: 20px; max-width: 80%; font-size: 1.1rem; letter-spacing: 0.5px; animation: fadeIn 0.3s forwards; }
        .word-bubble.nutzer { align-self: flex-end; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border-bottom-right-radius: 4px; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
        .word-bubble.poke { align-self: flex-start; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.05); color: white; border-bottom-left-radius: 4px; }
        .word-hint { text-align: center; font-size: 0.9rem; color: #a855f7; margin-top: 10px; font-weight: 600; }
        .word-input-container { display: flex; gap: 12px; margin-top: 20px; }
        .word-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 14px 20px; border-radius: 999px; color: white; font-size: 1.1rem; transition: border-color 0.3s; }
        .word-input:focus { outline: none; border-color: #6366f1; background: rgba(255,255,255,0.1); }
      </style>
    `;
  },

  async initialisieren(nutzer) {
    this._nutzer = nutzer;
    document.getElementById('abmelden-btn')?.addEventListener('click', () => Auth.abmelden());
    await this.spieleLaden();
  },

  async spieleLaden() {
    const [verfuegbar, aktiv] = await Promise.all([
      API.anfrage('GET', '/games/verfuegbar'),
      API.anfrage('GET', '/games/aktiv')
    ]);
    this._renderLobby(verfuegbar.spiele || []);
    this._renderAktiveSpiele(aktiv.spiele || []);
  },

  _renderLobby(spiele) {
    const container = document.getElementById('spiele-lobby');
    if (!container) return;
    if (!spiele.length) { container.innerHTML = `<p class="text-gedaempft">Keine Spiele verfügbar.</p>`; return; }
    container.innerHTML = spiele.map(s => `
      <div class="spiel-karte ${!s.istVerfuegbar ? 'gesperrt' : ''}" onclick="${s.istVerfuegbar ? `GamesView._spielStarten('${s.gameType}')` : ''}">
        <span class="spiel-icon">${s.icon || '🎮'}</span>
        <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 8px;">${UI.escapeHtml(s.name || s.gameType)}</div>
        <div style="font-size: 0.9rem; color: var(--text-sekundaer);">${UI.escapeHtml(s.beschreibung || '')}</div>
      </div>
    `).join('');
  },

  _renderAktiveSpiele(spiele) {
    const container = document.getElementById('spiele-aktiv');
    if (!container) return;
    if (!spiele.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <h3 style="margin-bottom:20px;font-size:1.2rem;font-weight:600;background: linear-gradient(to right, #6366f1, #a855f7); -webkit-background-clip: text; color: transparent;">Aktive Partien</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
        ${spiele.map(s => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:16px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <span style="font-size:2rem;">${s.meta?.icon || '🎮'}</span>
            <div style="flex:1;">
              <div style="font-weight:bold; font-size:1.1rem;">${UI.escapeHtml(s.meta?.name || s.game_type)}</div>
              <div style="font-size:0.85rem; color:${s.am_zug === 'nutzer' ? '#ef4444' : '#3b82f6'}; margin-top:4px;">
                ${s.am_zug === 'nutzer' ? '🔴 Dein Zug' : '🔵 Poke überlegt...'}
              </div>
            </div>
            <button class="btn btn-primaer btn-klein" style="border-radius:999px; padding:8px 20px;" onclick="GamesView._spielOeffnen(${s.id})">Spielen</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async _spielStarten(gameType) {
    try {
      const result = await API.anfrage('POST', '/games/starten', { gameType });
      UI.erfolg('Spiel gestartet!');
      await this._spielOeffnen(result.spiel.id);
    } catch (e) {
      if (e.message.includes('bereits ein aktives Spiel')) {
        const data = JSON.parse(e.message.split('\n')[1] || '{}');
        if (data.spielId) await this._spielOeffnen(data.spielId);
      } else { UI.fehler(e.message); }
    }
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
              JSON.stringify(daten.spiel.state.zugAnzahl) !== JSON.stringify(this._aktivesSpiel.state?.zugAnzahl)) {
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
      ? (state.gewinner === 'nutzer' ? '🏆 Sieg!' : state.gewinner === 'poke' ? '😔 Verloren' : '🤝 Unentschieden')
      : nutzerAmZug ? '🔴 Du bist dran!' : '⏳ Poke denkt nach...';
    const statusKlasse = !istAktiv ? '' : nutzerAmZug ? '' : 'poke-zug';

    let boardHtml = '';
    if (spiel.game_type === 'connect4') boardHtml = this._renderConnect4(state, nutzerAmZug);
    else if (spiel.game_type === 'tictactoe') boardHtml = this._renderTicTacToe(state, nutzerAmZug);
    else if (spiel.game_type === 'battleship') boardHtml = this._renderBattleship(state, nutzerAmZug);
    else if (spiel.game_type === 'ludo') boardHtml = this._renderLudo(state, nutzerAmZug);
    else if (spiel.game_type === 'wordgame') boardHtml = this._renderWordgame(state, nutzerAmZug);

    container.innerHTML = `
      <div class="board-wrapper">
        <div class="board-header">
          <div>
            <button class="btn btn-ghost btn-klein" style="margin-bottom:8px; opacity:0.7;" onclick="GamesView._zurueck()">← Zurück</button>
            <div class="board-title">${meta.icon || '🎮'} ${UI.escapeHtml(meta.name || spiel.game_type)}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end;">
            <span class="board-status ${statusKlasse}">${statusText}</span>
            <button id="btn-reminder" class="btn btn-klein" onclick="GamesView._pokeErinnern(${spiel.id})">Poke erinnern (30s)</button>
          </div>
        </div>
        ${boardHtml}
        <div style="margin-top:30px; text-align:center;">
          ${istAktiv ? `<button class="btn btn-ghost btn-klein" style="color:#ef4444;" onclick="GamesView._aufgeben(${spiel.id})">🏳️ Spiel aufgeben</button>` : `<button class="btn btn-primaer" style="border-radius:999px; padding:12px 30px; font-size:1.1rem;" onclick="GamesView._spielStarten('${spiel.game_type}')">Nochmal spielen</button>`}
        </div>
      </div>
    `;

    this._updateReminderButton(spiel.id);
  },

  _updateReminderButton(spielId) {
    const btn = document.getElementById('btn-reminder');
    if (!btn) return;
    if (this._reminderInterval) clearInterval(this._reminderInterval);
    
    if (!this._pokeTurnStart) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = 'inline-block';
    
    this._reminderInterval = setInterval(() => {
      const elapsed = (Date.now() - this._pokeTurnStart) / 1000;
      const left = Math.max(0, 30 - Math.floor(elapsed));
      if (left > 0) {
        btn.disabled = true;
        btn.textContent = `Warte auf Poke... (${left}s)`;
      } else {
        btn.disabled = false;
        btn.textContent = `🔔 Poke anstupsen`;
      }
    }, 1000);
  },

  async _pokeErinnern(spielId) {
    try {
      const btn = document.getElementById('btn-reminder');
      if (btn) { btn.disabled = true; btn.textContent = 'Erinnere...'; }
      await API.anfrage('POST', `/games/${spielId}/erinnern`);
      UI.erfolg('Erinnerung gesendet!');
      this._pokeTurnStart = Date.now(); // Reset timer
      this._updateReminderButton(spielId);
    } catch (e) { UI.fehler(e.message); }
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
      ? `<button class="btn btn-primaer" style="font-size:1.2rem; padding:12px 24px; border-radius:999px; box-shadow: 0 4px 15px rgba(99,102,241,0.4);" onclick="GamesView._macheZug({aktion: 'wuerfeln'})">🎲 Würfeln</button>` 
      : '';

    return `
      <div class="ludo-container">
        <div class="ludo-board">${gridHtml}</div>
        <div style="flex:1; background:rgba(0,0,0,0.2); padding:20px; border-radius:20px;">
          <h3 style="margin-bottom:16px;">Info</h3>
          <div style="margin-bottom:12px;"><strong>Letzter Wurf:</strong> <span style="font-size:1.5rem; font-weight:bold; color:#a855f7;">${state.letzterWurf || '-'}</span></div>
          ${wuerfelBtn}
          <div style="margin-top:20px; font-size:0.9rem; color:var(--text-sekundaer);">
            Wähle "Würfeln" und klicke dann auf eine rot leuchtende Figur, um sie zu bewegen.
          </div>
        </div>
      </div>
    `;
  },

  // ---------------- BATTLESHIP ----------------
  _renderBattleship(state, nutzerAmZug) {
    if (state.phase === 'setup') return this._renderBattleshipSetup();

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
          html += `<div class="${cls}" id="bs-${isPoke?'poke':'nutzer'}-${r}-${c}" ${onClick}>${z===2?'💥':z===3?'✖':''}</div>`;
        });
      });
      return html;
    };

    return `
      <div class="bs-container">
        <div class="bs-field">
          <h3 style="margin-bottom:16px; color:#f87171; text-align:center;">Pokes Gewässer (Ziel)</h3>
          <div class="bs-grid">${renderGrid(state.pokeFeldOhneSchiffe || state.pokeFeld, true, nutzerAmZug)}</div>
        </div>
        <div class="bs-field">
          <h3 style="margin-bottom:16px; color:#38bdf8; text-align:center;">Deine Flotte</h3>
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
      : `<span style="color:#34d399;">Alle Schiffe platziert!</span>`;

    return `
      <div style="text-align:center; max-width: 600px; margin: 0 auto;">
        <h3 style="margin-bottom:10px;">Flotten-Setup</h3>
        <p style="margin-bottom:20px; color:var(--text-sekundaer);">${info}</p>
        
        ${currSchiff ? `
          <button class="btn btn-sekundaer" style="margin-bottom:20px;" onclick="GamesView._bsSetupRotate()">
            Ausrichtung: ${s.horizontal ? 'Horizontal ↔️' : 'Vertikal ↕️'} (Klicken zum Drehen)
          </button>
        ` : ''}

        <div class="bs-field" style="display:inline-block; margin-bottom:20px;">
          <div class="bs-grid" id="bs-setup-grid">${html}</div>
        </div>

        <div>
          ${!currSchiff ? `<button class="btn btn-primaer" style="font-size:1.2rem; padding:12px 30px; border-radius:999px;" onclick="GamesView._bsSetupFertig()">🚀 Schlacht beginnen</button>` : ''}
          <button class="btn btn-ghost" style="color:#ef4444;" onclick="GamesView._spielOeffnen(GamesView._aktivesSpiel.id)">Neu aufstellen</button>
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
    // Connect 4 state.brett is [row][col] usually top to bottom.
    // Let's assume row 0 is top.
    for (let r = 0; r < state.brett.length; r++) {
      for (let c = 0; c < state.brett[r].length; c++) {
        const val = state.brett[r][c];
        const cls = val === 1 ? 'nutzer' : val === 2 ? 'poke' : '';
        gridHtml += `<div class="c4-cell"><div class="c4-chip ${cls}" id="c4-chip-${r}-${c}"></div></div>`;
      }
    }

    let buttons = '';
    for (let c = 0; c < 7; c++) {
      const klickbar = nutzerAmZug && !state.gewinner;
      const onClick = klickbar ? `onclick="GamesView._optimisticC4(${c})"` : '';
      buttons += `<div class="c4-col" style="display:flex; flex-direction:column;" ${onClick}>
                    <div style="flex:1;"></div>
                    <button class="c4-col-btn" ${!klickbar ? 'disabled' : ''}>⬇️</button>
                  </div>`;
    }

    return `
      <div class="c4-container">
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); height:40px; margin-bottom:4px;">${buttons}</div>
        <div class="c4-grid">${gridHtml}</div>
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
      const isNutzer = i % 2 === 0; // Assuming nutzer always starts Wordgame first word logically. Actually wait, whoever starts first is recorded in DB. Let's just assume alternating based on who is amZug right now vs length.
      // Better: if length is even, and amZug is nutzer, then nutzer made even moves.
      // If we don't store exactly who made which move, we can alternate.
      const startsFirst = (state.amZug === 'nutzer' && state.woerter.length % 2 === 0) || (state.amZug === 'poke' && state.woerter.length % 2 !== 0);
      const cls = startsFirst ? (i % 2 === 0 ? 'nutzer' : 'poke') : (i % 2 === 0 ? 'poke' : 'nutzer');
      return `<div class="word-bubble ${cls}">${UI.escapeHtml(w)}</div>`;
    }).join('');

    const hint = state.letzterBuchstabe 
      ? `Dein nächstes Wort muss mit <strong>${state.letzterBuchstabe.toUpperCase()}</strong> beginnen!` 
      : 'Beginne mit einem beliebigen Wort!';

    const input = (nutzerAmZug && !state.gewinner) ? `
      <div class="word-input-container">
        <input type="text" id="word-input" class="word-input" placeholder="Tippe dein Wort hier..." autocomplete="off">
        <button class="btn btn-primaer" style="border-radius:999px; padding:0 30px; font-weight:bold;" onclick="GamesView._submitWord()">Senden</button>
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

  // ---------------- GENERAL ----------------
  async _macheZug(zug) {
    try {
      // Optische Deaktivierung des Boards
      const board = document.getElementById('spiel-board');
      if (board) board.style.pointerEvents = 'none';

      const spielId = this._aktivesSpiel.id;
      const result = await API.anfrage('POST', `/games/${spielId}/zug`, { zug });
      
      this._aktivesSpiel = { ...this._aktivesSpiel, state: result.state, status: result.spielStatus };
      this._spielBoardRendern();

      if (result.spielStatus === 'finished') {
        clearInterval(this._pollingInterval);
        await this.spieleLaden();
      }
    } catch (e) {
      UI.fehler(e.message);
      this._spielBoardRendern(); // Reset board if optimistic failed
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

  zerstoeren() {
    clearInterval(this._pollingInterval);
    clearInterval(this._reminderInterval);
    if (this._sseListener) this._sseListener.close();
  }
};
