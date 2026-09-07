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
        .board-wrapper { flex: 2; min-width: 300px; background: rgba(15, 23, 42, 0.5); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.05); position: relative; }
        .board-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .board-title { font-size:1.8rem; font-weight:800; letter-spacing: -0.5px; background: linear-gradient(to right, #a855f7, #6366f1); -webkit-background-clip: text; color: transparent; display:flex; align-items:center; gap: 10px; }
        .board-status { font-size:1rem; padding:8px 20px; border-radius:999px; background:rgba(99,102,241,0.15); color:#818cf8; font-weight: 600; box-shadow: 0 4px 15px rgba(99,102,241,0.1); transition: all 0.3s; }
        .board-status.poke-zug { background:rgba(245,158,11,0.15); color:#f59e0b; box-shadow: 0 4px 15px rgba(245,158,11,0.1); }
        
        /* In-Game Chat */
        .chat-wrapper { flex: 1; min-width: 300px; background: rgba(15, 23, 42, 0.5); border-radius: 24px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; max-height: 800px; }
        .chat-log { flex: 1; overflow-y: auto; margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px; padding-right: 5px; }
        .chat-msg { padding: 10px 14px; border-radius: 12px; max-width: 85%; font-size: 0.95rem; }
        .chat-msg.nutzer { align-self: flex-end; background: #4f46e5; color: white; border-bottom-right-radius: 2px; }
        .chat-msg.poke { align-self: flex-start; background: rgba(255,255,255,0.1); color: white; border-bottom-left-radius: 2px; }
        
        /* Reminder Button */
        #btn-reminder { margin-top: 10px; border-radius: 999px; font-weight: bold; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: white; display: none; }
        #btn-reminder:disabled { background: rgba(255,255,255,0.1); color: var(--text-sekundaer); cursor: not-allowed; }

        /* Ludo (Mensch ärgere dich nicht) Premium Grid */
        .ludo-container { display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap; }
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
        .c4-container { background: linear-gradient(180deg, #1e3a8a, #172554); padding: 24px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.1); max-width: 500px; margin: 0 auto; position: relative; }
        .c4-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
        .c4-cell { width: 100%; aspect-ratio: 1; border-radius: 50%; background: #0f172a; box-shadow: inset 0 4px 10px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.1); position: relative; }
        .c4-chip { position: absolute; inset: 4px; border-radius: 50%; box-shadow: inset 0 -4px 8px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.5s cubic-bezier(0.5, 0, 0.5, 1); }
        .c4-chip.nutzer { background: radial-gradient(circle at 30% 30%, #fca5a5, #ef4444 60%, #991b1b); }
        .c4-chip.poke { background: radial-gradient(circle at 30% 30%, #fcd34d, #f59e0b 60%, #b45309); }
        .c4-col { position: relative; cursor: pointer; border-radius: 12px; transition: background 0.2s; }
        .c4-col:hover { background: rgba(255,255,255,0.1); }
        .c4-overlay { position: absolute; inset: 24px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; z-index: 10; }

        /* Tic Tac Toe Premium */
        .ttt-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 320px; margin: 0 auto; }
        .ttt-cell { aspect-ratio: 1; background: rgba(255,255,255,0.02); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 4rem; cursor: pointer; transition: all 0.3s; border: 2px solid rgba(255,255,255,0.05); }
        .ttt-cell:hover:not(.belegt) { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); box-shadow: 0 0 20px rgba(99,102,241,0.2); }
        .ttt-cell.nutzer { color: #ef4444; text-shadow: 0 0 20px rgba(239,68,68,0.5); }
        .ttt-cell.poke { color: #3b82f6; text-shadow: 0 0 20px rgba(59,130,246,0.5); }

        /* Wordgame & Akinator */
        .word-chat { display: flex; flex-direction: column; gap: 16px; background: rgba(0,0,0,0.2); padding: 24px; border-radius: 20px; max-height: 400px; overflow-y: auto; }
        .word-bubble { padding: 12px 20px; border-radius: 20px; max-width: 80%; font-size: 1.1rem; letter-spacing: 0.5px; animation: fadeIn 0.3s forwards; }
        .word-bubble.nutzer { align-self: flex-end; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border-bottom-right-radius: 4px; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
        .word-bubble.poke { align-self: flex-start; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.05); color: white; border-bottom-left-radius: 4px; }
        .word-hint { text-align: center; font-size: 1rem; color: #a855f7; margin-top: 15px; font-weight: 600; }
        .word-input-container { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
        .word-input { flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 14px 20px; border-radius: 999px; color: white; font-size: 1.1rem; transition: border-color 0.3s; }
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
      API.anfrage('GET', '/games/verfuegbar?_t=' + Date.now()),
      API.anfrage('GET', '/games/aktiv?_t=' + Date.now())
    ]);
    this._renderLobby(verfuegbar.spiele || []);
    this._renderAktiveSpiele(aktiv.spiele || []);
  },

  _renderLobby(spiele) {
    const container = document.getElementById('spiele-lobby');
    if (!container) return;
    if (!spiele.length) { container.innerHTML = `<p class="text-gedaempft">Keine Spiele verfügbar.</p>`; return; }
    container.innerHTML = spiele.map(s => `
      <div class="spiel-karte ${!s.istVerfuegbar ? 'gesperrt' : ''}" onclick="${s.istVerfuegbar ? `GamesView._zeigeStarterAuswahl('${s.gameType}')` : ''}">
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

  async _spielStarten(gameType, starter = 'nutzer', bonusErlaubt = false, geheimesWort = '') {
    try {
      const result = await API.anfrage('POST', '/games/starten', { gameType, starter, bonusErlaubt, geheimesWort });
      UI.erfolg('Spiel gestartet!');
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
      <div style="margin-top:20px; text-align:left; background:rgba(0,0,0,0.2); padding:20px; border-radius:16px;">
        <h4 style="margin-bottom:10px;">Akinator Optionen</h4>
        <div style="margin-bottom: 15px;" id="aki-wort-container">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">Welches Wort soll Poke erraten? (Wenn du das Wort vorgibst)</label>
          <input type="text" id="aki-wort" class="word-input" style="width:100%; border-radius:12px;" placeholder="Geheimes Wort...">
        </div>
        <div>
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" id="aki-bonus" style="width:20px; height:20px;">
            <span>Bonusfragen erlauben (kein Limit bei 20 Fragen)</span>
          </label>
        </div>
      </div>
    ` : '';

    const labelIch = isAkinator ? 'Ich rate (Poke überlegt sich Wort)' : 'Ich beginne';
    const labelPoke = isAkinator ? 'Poke rät (Ich überlege mir Wort)' : 'Poke beginnt';

    const html = `
      <div style="text-align:center; padding: 20px;">
        <h2 style="margin-bottom:20px; color:#a855f7;">Wer soll anfangen?</h2>
        <div style="display:flex; gap:15px; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primaer" style="padding:15px 30px; font-size:1.1rem; border-radius:16px;" onclick="GamesView._starteMitAnimation('${gameType}', 'nutzer')">👤 ${labelIch}</button>
          <button class="btn btn-sekundaer" style="padding:15px 30px; font-size:1.1rem; border-radius:16px;" onclick="GamesView._starteMitAnimation('${gameType}', 'poke')">🤖 ${labelPoke}</button>
          <button class="btn btn-ghost" style="padding:15px 30px; font-size:1.1rem; border-radius:16px; border:2px dashed rgba(255,255,255,0.2);" onclick="GamesView._starteMitAnimation('${gameType}', 'zufall')">🎲 Zufall</button>
        </div>
        ${extraHtml}
        
        <div id="zufall-animation-container" style="display:none; margin-top:30px;">
          <div id="zufall-box" style="width:80px; height:80px; border-radius:20px; background:linear-gradient(135deg, #6366f1, #a855f7); margin:0 auto; display:flex; align-items:center; justify-content:center; font-size:2.5rem; transition: transform 0.1s; box-shadow: 0 10px 30px rgba(99,102,241,0.5);">🎲</div>
          <div id="zufall-text" style="margin-top:15px; font-size:1.2rem; font-weight:bold;">Wird ausgelost...</div>
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
        UI.fehler('Bitte gib ein geheimes Wort ein, für den Fall, dass Poke raten muss!');
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
      box.textContent = isNutzer ? '👤' : '🤖';
      box.style.transform = `scale(1.1) rotate(${counter * 15}deg)`;
      box.style.background = isNutzer ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const winner = Math.random() > 0.5 ? 'nutzer' : 'poke';
      const isNutzer = winner === 'nutzer';
      box.textContent = isNutzer ? '👤' : '🤖';
      box.style.transform = `scale(1.3) rotate(0deg)`;
      box.style.background = isNutzer ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
      txt.textContent = isNutzer ? 'Du fängst an!' : 'Poke fängt an!';
      
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
      ? (state.gewinner === 'nutzer' ? '🏆 Sieg!' : state.gewinner === 'poke' ? '😔 Verloren' : '🤝 Unentschieden')
      : nutzerAmZug ? '🔴 Du bist dran!' : '⏳ Poke denkt nach...';
    const statusKlasse = !istAktiv ? '' : nutzerAmZug ? '' : 'poke-zug';

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
      chatHtml = `<div style="text-align:center; color:var(--text-sekundaer); margin-top:20px; font-size:0.9rem;">Noch keine Nachrichten.</div>`;
    }

    container.innerHTML = `
      <div style="display:flex; gap:20px; max-width:1200px; margin:0 auto; flex-wrap:wrap; align-items:flex-start;">
        <div class="board-wrapper">
          <div class="board-header">
            <div>
              <button class="btn btn-ghost btn-klein" style="margin-bottom:8px; opacity:0.7;" onclick="GamesView._zurueck()">← Zurück</button>
              <div class="board-title">
                ${meta.icon || '🎮'} ${UI.escapeHtml(meta.name || spiel.game_type)}
                <button class="btn btn-sekundaer btn-klein" style="border-radius:50%; width:30px; height:30px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="GamesView._zeigeRegeln('${spiel.game_type}')" title="Spielregeln">ℹ️</button>
              </div>
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
        
        <div class="chat-wrapper">
          <h3 style="margin-bottom:15px; font-size:1.1rem;">💬 Spiel-Chat</h3>
          <div class="chat-log" id="game-chat-log">${chatHtml}</div>
          <div style="display:flex; gap:10px;">
            <input type="text" id="game-chat-input" class="word-input" style="padding:10px 15px; font-size:0.9rem;" placeholder="Schreibe Poke..." onkeydown="if(event.key==='Enter') GamesView._sendChat()">
            <button class="btn btn-primaer" style="border-radius:999px; padding:0 15px;" onclick="GamesView._sendChat()">Senden</button>
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
    const ruleStyles = `
      <style>
        .rule-section { margin-bottom: 20px; }
        .rule-title { font-size: 1.2rem; font-weight: bold; color: #a855f7; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .rule-text { font-size: 1rem; color: var(--text-primaer); line-height: 1.6; }
        .rule-list { margin-top: 10px; padding-left: 20px; list-style-type: none; }
        .rule-list li { margin-bottom: 8px; position: relative; }
        .rule-list li::before { content: '✨'; position: absolute; left: -25px; top: 0; font-size: 0.9rem; }
        .rule-highlight { background: rgba(168, 85, 247, 0.15); padding: 2px 6px; border-radius: 4px; color: #c084fc; font-weight: 600; }
        .rule-box { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-top: 15px; }
      </style>
    `;

    switch (gameType) {
      case 'connect4':
        titel = '🟡 4 Gewinnt – Strategie & Schwerkraft';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Tauche ein in den absoluten Strategie-Klassiker! Dein Ziel ist es, als erster Spieler <span class="rule-highlight">vier eigene Chips</span> in eine ununterbrochene Linie zu bringen.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Das Spielbrett besteht aus 7 Spalten und 6 Reihen.</li>
              <li>Du spielst abwechselnd mit Poke. Klicke auf eine Spalte, um deinen Chip fallen zu lassen.</li>
              <li>Chips fallen immer bis zum untersten freien Feld der Spalte durch.</li>
              <li>Die Vierer-Reihe darf <strong>horizontal, vertikal oder diagonal</strong> sein!</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>💡 Profi-Tipp:</strong> Achte nicht nur auf deine eigenen Linien, sondern blockiere Poke rechtzeitig! Oft gewinnt derjenige, der den Gegner in eine Falle lockt.
          </div>
        `;
        break;
      case 'tictactoe':
        titel = '⭕ Tic Tac Toe – Schnell & Taktisch';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Der zeitlose Kampf zwischen Kreuz (✕) und Kreis (◯). Wer zuerst <span class="rule-highlight">drei Symbole in einer Reihe</span> hat, gewinnt das Duell!</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Gespielt wird auf einem 3x3 Raster.</li>
              <li>Du und Poke setzt abwechselnd eure Symbole auf freie Felder.</li>
              <li>Die Reihe kann horizontal, vertikal oder diagonal verlaufen.</li>
              <li>Sind alle 9 Felder belegt und niemand hat drei in einer Reihe, endet das Spiel unentschieden.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>💡 Profi-Tipp:</strong> Die Mitte ist das mächtigste Feld. Wenn du startest, sichere sie dir!
          </div>
        `;
        break;
      case 'ludo':
        titel = '🎲 Mensch ärgere dich nicht – Nervenkitzel pur!';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Ein Rennen um die Welt! Bringe als Erster alle deine <span class="rule-highlight">vier Spielfiguren</span> sicher in dein Zielfeld.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Würfeln:</strong> Ihr seid abwechselnd dran. Klicke auf "Würfeln", um deine Zahl zu bestimmen.</li>
              <li><strong>Herauskommen:</strong> Du brauchst eine <strong>6</strong>, um eine Figur aus dem Haus auf das Startfeld zu setzen! Danach darfst du <strong>direkt nochmal würfeln</strong>.</li>
              <li><strong>Bewegen:</strong> Klicke auf eine leuchtende Figur, um sie um die gewürfelte Augenzahl vorzurücken.</li>
              <li><strong>Schlagen:</strong> Landest du genau auf einem Feld, auf dem Poke steht? Bam! Seine Figur wird zurück ins Haus geschickt (und umgekehrt!).</li>
              <li><strong>Blockaden:</strong> Du kannst nicht auf ein Feld ziehen, das bereits von deiner eigenen Figur besetzt ist.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>💡 Profi-Tipp:</strong> Ärgere dich nicht, wenn du kurz vor dem Ziel geschlagen wirst – Rache ist süß!
          </div>
        `;
        break;
      case 'battleship':
        titel = '⚓ Schiffe versenken – Die große Seeschlacht';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Spiele Admiral! Finde und <span class="rule-highlight">versenke die gesamte Flotte</span> von Poke, bevor er deine Schiffe auf den Grund des Ozeans schickt.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Die Aufstellung:</strong> Zuerst platzierst du deine Flotte heimlich auf deinem Raster. Poke wählt zeitgleich sein Setup.</li>
              <li><strong>Das Feuergefecht:</strong> Schießt abwechselnd auf die Koordinaten des gegnerischen Feldes.</li>
              <li><strong>🌊 Wasser (Fehlschuss):</strong> Du hast nichts getroffen. Poke ist dran.</li>
              <li><strong>💥 Treffer:</strong> Du hast ein Schiff erwischt! <strong>Und jetzt kommt das Beste: Du darfst direkt noch einmal schießen!</strong> Das gilt so lange, bis du Wasser triffst.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>💡 Profi-Tipp:</strong> Schiffe können horizontal oder vertikal liegen. Wenn du triffst, schieße im nächsten Zug auf die angrenzenden Felder!
          </div>
        `;
        break;
      case 'wordgame':
        titel = '🔤 Wortspiel – Der ultimative Buchstabensalat';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Beweise deinen gigantischen Wortschatz in einer endlosen Kette aus Wörtern!</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li>Der Startspieler nennt ein beliebiges Wort.</li>
              <li>Der nächste Spieler muss nun ein Wort bilden, das <strong>mit dem letzten Buchstaben</strong> des vorherigen Wortes beginnt.</li>
              <li><em>Beispiel:</em> Apfe<strong>l</strong> ➡️ <strong>L</strong>oc<strong>h</strong> ➡️ <strong>H</strong>au<strong>s</strong> ➡️ <strong>S</strong>and.</li>
              <li>Kein Wort darf doppelt genannt werden!</li>
              <li>Wem nichts mehr einfällt, der verliert.</li>
            </ul>
          </div>
        `;
        break;
      case 'akinator':
        titel = '🧞 Wer bin ich? (Akinator) – Mindgames';
        text = `
          <div class="rule-section">
            <div class="rule-title">🎯 Das Spielziel</div>
            <div class="rule-text">Bist du ein Gedankenleser? Ein Spieler denkt sich ein Wort aus, der andere muss es mit gezielten Fragen <span class="rule-highlight">erraten</span>.</div>
          </div>
          <div class="rule-section">
            <div class="rule-title">📜 So wird gespielt</div>
            <ul class="rule-list rule-text">
              <li><strong>Die Rollen:</strong> Zu Beginn wählt ihr, wer sich das Wort ausdenkt (Wortgeber) und wer rät (Rater).</li>
              <li><strong>Die Fragen:</strong> Der Rater darf bis zu 20 Fragen stellen.</li>
              <li><strong>Die Antworten:</strong> Der Wortgeber darf nur mit <em>Ja, Nein, Ich weiß nicht, Wahrscheinlich ja, Wahrscheinlich nicht</em> oder <em>Überspringen</em> antworten.</li>
              <li><strong>Die Auflösung:</strong> Der Rater kann jederzeit auf "Auflösen" klicken und seinen finalen Tipp abgeben.</li>
              <li><strong>Das Urteil:</strong> Am Ende stimmen beide Spieler ab, ob das erratene Wort richtig war (Synonyme gelten!). Sind beide sich einig, gewinnt der Rater.</li>
            </ul>
          </div>
          <div class="rule-box rule-text">
            <strong>💡 Profi-Tipp:</strong> Fange mit ganz groben Kategorien an (Tier? Gegenstand? Ort?) und werde dann Schritt für Schritt spezifischer!
          </div>
        `;
        break;
    }
    UI.modalZeigen('<h2 style="margin-bottom:15px; color:#a855f7;">' + titel + '</h2>' + ruleStyles + text);
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
    if (state.phase === 'setup_poke') {
      return `
        <div style="text-align:center; padding: 40px;">
          <div class="lade-spinner" style="width: 40px; height: 40px; border-width: 4px; border-color: #3b82f6 transparent #3b82f6 transparent; margin-bottom: 20px;"></div>
          <h3>Poke wählt gerade seine Flotte...</h3>
          <p style="color:var(--text-sekundaer);">Er hat drei Aufstellungen zur Auswahl bekommen und entscheidet sich gleich.</p>
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
          ${!currSchiff ? `<button class="btn btn-primaer" style="font-size:1.2rem; padding:12px 30px; border-radius:999px;" onclick="GamesView._bsSetupFertig()">🚀 Flotte bestätigen</button>` : ''}
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

  // ---------------- AKINATOR ----------------
  _renderAkinator(state, nutzerAmZug) {
    if (state.phase === 'fragen') {
      const isNutzerRater = state.rater === 'nutzer';
      const maxFragen = state.bonusErlaubt ? '∞' : 20;
      const count = state.fragen.filter(f => f.typ === 'antwort' && f.text.toLowerCase() !== 'überspringen').length;
      
      const bubs = state.fragen.map(f => {
        const cls = f.absender === 'nutzer' ? 'nutzer' : 'poke';
        const prefix = f.typ === 'loesung' ? '🎯 Lösung: ' : '';
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
                <button class="btn btn-sekundaer" style="background:#ef4444;" onclick="GamesView._akiMacheZug({aktion: 'loesen', wort: document.getElementById('aki-loesen').value})">Auflösen!</button>
              </div>
            </div>
          `;
        } else {
          interaktion = `
            <div style="text-align:center; font-weight:bold; margin-bottom:10px;">Dein Wort: <span style="color:#a855f7;">${UI.escapeHtml(state.wort)}</span></div>
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
        <div style="max-width: 500px; margin: 0 auto; text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:24px;">
          <h2 style="margin-bottom:10px;">Die Auflösung!</h2>
          <p style="font-size:1.2rem;">Geratenes Wort: <strong style="color:#38bdf8;">${UI.escapeHtml(loesung)}</strong></p>
          <p style="font-size:1.2rem; margin-bottom:30px;">Echtes Wort: <strong style="color:#a855f7;">${UI.escapeHtml(state.wort)}</strong></p>
          
          <h4 style="margin-bottom:15px;">Stimmen diese Wörter in etwa überein?</h4>
          ${myVote === null ? `
            <div style="display:flex; gap:20px; justify-content:center;">
              <button class="btn btn-primaer" style="background:#10b981; padding:10px 40px; font-size:1.2rem;" onclick="GamesView._macheZug({aktion: 'abstimmen', zustimmung: true})">Ja, passt!</button>
              <button class="btn btn-primaer" style="background:#ef4444; padding:10px 40px; font-size:1.2rem;" onclick="GamesView._macheZug({aktion: 'abstimmen', zustimmung: false})">Nein</button>
            </div>
          ` : `
            <div style="color:var(--text-sekundaer);">Du hast abgestimmt. Warte auf Poke...</div>
          `}
        </div>
      `;
    }
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
