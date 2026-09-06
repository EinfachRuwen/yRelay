// Spielebereich - Frontend View
'use strict';

const GamesView = {
  _aktivesSpiel: null,
  _sseListener: null,

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
          <div class="sektion-titel" style="margin-bottom:8px;">🎮 Spielebereich</div>
          <p style="color:var(--text-sekundaer);margin-bottom:28px;">Spiele zeitversetzt mit Poke. Wenn du einen Zug machst, wird Poke benachrichtigt und antwortet, wenn er kann.</p>

          <div id="spiele-lobby" class="spiele-lobby"></div>
          <div id="spiele-aktiv" style="margin-top:28px;"></div>
          <div id="spiel-board" style="display:none;"></div>
        </main>
      </div>
      <style>
        .spiele-inhalt { max-width: 1100px; }
        .spiele-lobby { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .spiel-karte {
          background: linear-gradient(135deg, var(--karte-hintergrund) 0%, rgba(99,102,241,0.04) 100%);
          border: 1px solid var(--rahmen);
          border-radius: var(--radius);
          padding: 24px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.2,0,0,1);
          position: relative;
          overflow: hidden;
        }
        .spiel-karte::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.08), transparent);
          opacity: 0; transition: opacity 0.25s;
        }
        .spiel-karte:hover::before { opacity: 1; }
        .spiel-karte:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.4); box-shadow: 0 8px 32px rgba(99,102,241,0.15); }
        .spiel-karte.gesperrt { opacity: 0.45; cursor: not-allowed; }
        .spiel-karte.gesperrt:hover { transform: none; border-color: var(--rahmen); box-shadow: none; }
        .spiel-icon { font-size: 2.8rem; margin-bottom: 14px; display: block; }
        .spiel-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; }
        .spiel-beschreibung { font-size: 0.85rem; color: var(--text-sekundaer); line-height: 1.55; }
        .spiel-badge { display:inline-block; margin-top:12px; font-size:0.75rem; padding:3px 10px; border-radius:999px; background:rgba(99,102,241,0.15); color:#818cf8; }
        .spiel-badge.aktiv-badge { background:rgba(16,185,129,0.15); color:#34d399; }

        .aktive-spiele-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .aktiv-karte { background: var(--karte-hintergrund); border: 1px solid var(--rahmen); border-radius: var(--radius-klein); padding: 16px; display:flex; align-items:center; gap:14px; }
        .aktiv-karte-info { flex:1; min-width:0; }
        .aktiv-karte-name { font-weight: 600; font-size:0.9rem; }
        .aktiv-karte-status { font-size:0.8rem; color:var(--text-sekundaer); margin-top:2px; }

        /* ─── Spielbretter ─── */
        .board-wrapper { max-width: 700px; }
        .board-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .board-title { font-size:1.3rem; font-weight:700; }
        .board-status { font-size:0.9rem; padding:6px 16px; border-radius:999px; background:rgba(99,102,241,0.15); color:#818cf8; }
        .board-status.poke-zug { background:rgba(245,158,11,0.15); color:#f59e0b; }
        .board-status.gewonnen { background:rgba(16,185,129,0.15); color:#34d399; }
        .board-status.verloren { background:rgba(239,68,68,0.15); color:#f87171; }

        /* Connect 4 */
        .connect4-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; background:rgba(30,58,138,0.3); padding:12px; border-radius:12px; margin-bottom:16px; }
        .connect4-cell { width:100%; aspect-ratio:1; border-radius:50%; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.05); transition:all 0.2s; }
        .connect4-cell.spieler1 { background:linear-gradient(135deg,#ef4444,#dc2626); box-shadow:0 2px 8px rgba(239,68,68,0.4); }
        .connect4-cell.spieler2 { background:linear-gradient(135deg,#fbbf24,#f59e0b); box-shadow:0 2px 8px rgba(251,191,36,0.4); }
        .connect4-buttons { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
        .connect4-buttons .btn { padding:6px; font-size:0.8rem; min-width:0; }

        /* Tic Tac Toe */
        .ttt-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; max-width:280px; margin:0 auto 16px; }
        .ttt-cell { aspect-ratio:1; border-radius:10px; background:rgba(255,255,255,0.05); border:2px solid rgba(255,255,255,0.08); font-size:2rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; }
        .ttt-cell:hover:not(.belegt) { background:rgba(99,102,241,0.12); border-color:rgba(99,102,241,0.3); }
        .ttt-cell.belegt { cursor:default; }
        .ttt-cell.x { color:#ef4444; }
        .ttt-cell.o { color:#3b82f6; }

        /* Battleship */
        .bs-container { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .bs-field { }
        .bs-field-title { font-size:0.85rem; color:var(--text-sekundaer); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px; }
        .bs-grid { display:grid; grid-template-columns:repeat(11,1fr); gap:2px; }
        .bs-cell { aspect-ratio:1; font-size:0.6rem; border-radius:3px; background:rgba(59,130,246,0.08); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.12s; }
        .bs-cell:hover:not(.kein-klick) { background:rgba(59,130,246,0.2); }
        .bs-cell.kein-klick { cursor:default; }
        .bs-cell.header { background:transparent; cursor:default; font-weight:600; color:var(--text-sekundaer); }
        .bs-cell.schiff { background:rgba(99,102,241,0.15); }
        .bs-cell.treffer { background:rgba(239,68,68,0.3); }
        .bs-cell.wasser { background:rgba(59,130,246,0.2); opacity:0.5; }

        /* Ludo */
        .ludo-info { background:var(--karte-hintergrund); border:1px solid var(--rahmen); border-radius:var(--radius-klein); padding:18px; margin-bottom:16px; }
        .ludo-spieler { display:flex; gap:20px; margin-bottom:14px; }
        .ludo-figuren { display:flex; gap:6px; flex-wrap:wrap; }

        /* Wortspiel */
        .wort-verlauf { max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding:12px; background:var(--eingabe-hintergrund); border-radius:var(--radius-klein); margin-bottom:12px; }
        .wort-eintrag { display:flex; gap:8px; align-items:baseline; }
        .wort-spieler { font-size:0.75rem; color:var(--text-sekundaer); flex-shrink:0; }
        .wort-text { font-size:0.95rem; font-weight:500; }
        .wort-buchstabe { font-size:0.75rem; color:#818cf8; }

        @media (max-width: 640px) {
          .spiele-lobby { grid-template-columns: 1fr; }
          .bs-container { grid-template-columns: 1fr; }
          .bs-cell { font-size: 0.5rem; }
        }
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

    if (!spiele.length) {
      container.innerHTML = `<div class="leer-zustand"><span class="leere-liste-icon">🔒</span><p>Derzeit sind keine Spiele für dich verfügbar.</p></div>`;
      return;
    }

    container.innerHTML = spiele.map(s => `
      <div class="spiel-karte ${!s.istVerfuegbar ? 'gesperrt' : ''}" id="spiel-karte-${s.gameType}"
           ${s.istVerfuegbar ? `onclick="GamesView._spielStarten('${s.gameType}')"` : ''}>
        <span class="spiel-icon">${s.icon || '🎮'}</span>
        <div class="spiel-name">${UI.escapeHtml(s.name || s.gameType)}</div>
        <div class="spiel-beschreibung">${UI.escapeHtml(s.beschreibung || '')}</div>
        <span class="spiel-badge ${s.istVerfuegbar ? '' : ''}">${s.istVerfuegbar ? 'Spielen' : 'Nicht verfügbar'}</span>
      </div>
    `).join('');
  },

  _renderAktiveSpiele(spiele) {
    const container = document.getElementById('spiele-aktiv');
    if (!container) return;

    if (!spiele.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <h3 style="margin-bottom:14px;font-size:1rem;color:var(--text-sekundaer);text-transform:uppercase;letter-spacing:1px;">Aktive Spiele</h3>
      <div class="aktive-spiele-grid">
        ${spiele.map(s => `
          <div class="aktiv-karte">
            <span style="font-size:1.8rem;">${s.meta?.icon || '🎮'}</span>
            <div class="aktiv-karte-info">
              <div class="aktiv-karte-name">${UI.escapeHtml(s.meta?.name || s.game_type)}</div>
              <div class="aktiv-karte-status">${s.am_zug === 'nutzer' ? '🔴 Du bist dran!' : '⏳ Poke ist dran'}</div>
            </div>
            <button class="btn btn-primaer btn-klein" onclick="GamesView._spielOeffnen(${s.id})">Spielen</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async _spielStarten(gameType) {
    try {
      const result = await API.anfrage('POST', '/games/starten', { gameType });
      UI.erfolg(`${result.spiel.meta?.name || gameType} gestartet! Poke wurde benachrichtigt.`);
      await this._spielOeffnen(result.spiel.id);
    } catch (e) {
      if (e.message.includes('bereits ein aktives Spiel')) {
        const data = JSON.parse(e.message.split('\n')[1] || '{}');
        if (data.spielId) await this._spielOeffnen(data.spielId);
      } else {
        UI.fehler(e.message);
      }
    }
  },

  async _spielOeffnen(spielId) {
    document.getElementById('spiel-board').style.display = 'block';
    document.getElementById('spiele-lobby').style.display = 'none';
    document.getElementById('spiele-aktiv').style.display = 'none';
    await this._spielLaden(spielId);

    // SSE für Echtzeit-Updates von Poke
    this._starteSseListener(spielId);
  },

  _starteSseListener(spielId) {
    if (this._sseListener) this._sseListener.close();
    // Nutze bestehenden SSE-Stream vom Schuldashboard falls verfügbar, sonst polling
    this._pollingInterval = setInterval(async () => {
      if (this._aktivesSpiel?.id === spielId) {
        try {
          const daten = await API.anfrage('GET', `/games/${spielId}`);
          if (daten.spiel.status !== this._aktivesSpiel.status ||
              JSON.stringify(daten.spiel.state.zugAnzahl) !== JSON.stringify(this._aktivesSpiel.state?.zugAnzahl)) {
            this._aktivesSpiel = daten.spiel;
            this._spielBoardRendern(daten.spiel);
          }
        } catch (e) {}
      }
    }, 3000);
  },

  async _spielLaden(spielId) {
    try {
      const daten = await API.anfrage('GET', `/games/${spielId}`);
      this._aktivesSpiel = daten.spiel;
      this._spielBoardRendern(daten.spiel);
    } catch (e) {
      UI.fehler('Spiel konnte nicht geladen werden.');
    }
  },

  _spielBoardRendern(spiel) {
    const container = document.getElementById('spiel-board');
    if (!container) return;

    const state = spiel.state;
    const meta = spiel.meta || {};
    const istAktiv = spiel.status === 'active';
    const nutzerAmZug = state.amZug === 'nutzer' && istAktiv;

    const statusText = !istAktiv
      ? (state.gewinner === 'nutzer' ? '🏆 Du hast gewonnen!' : state.gewinner === 'poke' ? '😔 Poke hat gewonnen' : state.gewinner === 'unentschieden' ? '🤝 Unentschieden!' : 'Spiel beendet')
      : nutzerAmZug ? '🔴 Du bist dran!' : '⏳ Warte auf Poke...';

    const statusKlasse = !istAktiv
      ? (state.gewinner === 'nutzer' ? 'gewonnen' : state.gewinner === 'unentschieden' ? '' : 'verloren')
      : nutzerAmZug ? '' : 'poke-zug';

    let boardHtml = '';
    switch (spiel.game_type) {
      case 'connect4':   boardHtml = this._renderConnect4(state, nutzerAmZug); break;
      case 'tictactoe':  boardHtml = this._renderTicTacToe(state, nutzerAmZug); break;
      case 'battleship': boardHtml = this._renderBattleship(state, nutzerAmZug); break;
      case 'ludo':       boardHtml = this._renderLudo(state, nutzerAmZug); break;
      case 'wordgame':   boardHtml = this._renderWordgame(state, nutzerAmZug); break;
    }

    container.innerHTML = `
      <div class="board-wrapper">
        <div class="board-header">
          <div>
            <button class="btn btn-ghost btn-klein" style="margin-bottom:8px;" onclick="GamesView._zurueck()">← Übersicht</button>
            <div class="board-title">${meta.icon || '🎮'} ${UI.escapeHtml(meta.name || spiel.game_type)}</div>
          </div>
          <span class="board-status ${statusKlasse}">${statusText}</span>
        </div>
        ${boardHtml}
        ${istAktiv ? `<button class="btn btn-ghost btn-klein" style="margin-top:16px;color:var(--farbe-gefahr);" onclick="GamesView._aufgeben(${spiel.id})">🏳️ Aufgeben</button>` : `<button class="btn btn-primaer btn-klein" style="margin-top:16px;" onclick="GamesView._spielStarten('${spiel.game_type}')">Neues Spiel</button>`}
      </div>
    `;

    this._boardEvents(spiel, nutzerAmZug);
  },

  _renderConnect4(state, nutzerAmZug) {
    const sym = { 0: '', 1: 'spieler1', 2: 'spieler2' };
    const zellen = state.brett.flat().map((v, i) => `<div class="connect4-cell ${sym[v]}"></div>`).join('');
    const buttons = state.gewinner ? '' : Array.from({length:7},(_,i) => `<button class="btn btn-sekundaer btn-klein" data-spielzug="connect4" data-spalte="${i}" ${!nutzerAmZug ? 'disabled' : ''}>${i+1}</button>`).join('');
    return `<div class="connect4-grid">${zellen}</div><div class="connect4-buttons">${buttons}</div>`;
  },

  _renderTicTacToe(state, nutzerAmZug) {
    const sym = { 0: '', 1: '❌', 2: '⭕' };
    const kl = { 0: '', 1: 'x belegt', 2: 'o belegt' };
    const zellen = state.brett.map((v, i) => `<div class="ttt-cell ${kl[v]}" data-spielzug="tictactoe" data-feld="${i}" ${!nutzerAmZug || v !== 0 ? '' : ''}>${sym[v]}</div>`).join('');
    return `<div class="ttt-grid">${zellen}</div>`;
  },

  _renderBattleship(state, nutzerAmZug) {
    const cols = 'ABCDEFGHIJ';
    const poke = state.pokeFeldOhneSchiffe || state.pokeFeld;

    const renderGrid = (feld, klickbar, prefix) => {
      const header = ['', '1','2','3','4','5','6','7','8','9','10'].map(h => `<div class="bs-cell header">${h}</div>`).join('');
      const reihen = feld.map((reihe, ri) => {
        const kopf = `<div class="bs-cell header">${cols[ri]}</div>`;
        const zellen = reihe.map((z, ci) => {
          let kl = 'bs-cell';
          let emoji = '';
          if (z === 1) { kl += ' schiff'; emoji = '🚢'; }
          else if (z === 2) { kl += ' treffer'; emoji = '💥'; }
          else if (z === 3) { kl += ' wasser kein-klick'; emoji = '🌊'; }
          else if (!klickbar) kl += ' kein-klick';
          const click = klickbar && z !== 2 && z !== 3 ? `data-spielzug="battleship" data-r="${ri}" data-c="${ci}"` : '';
          return `<div class="${kl}" ${click}>${emoji}</div>`;
        }).join('');
        return kopf + zellen;
      }).join('');
      return header + reihen;
    };

    return `
      <div class="bs-container">
        <div class="bs-field">
          <div class="bs-field-title">Pokes Flotte - du schießt hier</div>
          <div class="bs-grid">${renderGrid(poke, nutzerAmZug, 'poke')}</div>
        </div>
        <div class="bs-field">
          <div class="bs-field-title">Deine Flotte</div>
          <div class="bs-grid">${renderGrid(state.nutzerFeld, false, 'nutzer')}</div>
        </div>
      </div>
    `;
  },

  _renderLudo(state, nutzerAmZug) {
    const { figuren, letzterWurf, mussWuerfeln } = state;
    const imHaus = sp => figuren[sp].filter(p => p < 0).length;
    const aufFeld = sp => figuren[sp].filter(p => p >= 0 && p < 40).length;
    const imZiel = sp => figuren[sp].filter(p => p >= 100 || p >= 200).length;

    const figurenButtons = !state.gewinner && nutzerAmZug && !mussWuerfeln
      ? figuren.nutzer.map((pos, i) => {
          const hatZug = pos >= 0 || (letzterWurf === 6 && pos < 0);
          return `<button class="btn btn-sekundaer btn-klein" data-spielzug="ludo" data-figur="${i}" ${!hatZug ? 'disabled' : ''}>Figur ${i+1} (Pos: ${pos < 0 ? 'Haus' : pos >= 100 ? 'Ziel' : pos})</button>`;
        }).join('')
      : '';

    return `
      <div class="ludo-info">
        <div class="ludo-spieler">
          <div><strong>🔴 Du:</strong> 🏠 ${imHaus('nutzer')} | 🏃 ${aufFeld('nutzer')} | 🏁 ${imZiel('nutzer')}</div>
          <div><strong>🔵 Poke:</strong> 🏠 ${imHaus('poke')} | 🏃 ${aufFeld('poke')} | 🏁 ${imZiel('poke')}</div>
        </div>
        ${letzterWurf ? `<div style="margin-bottom:12px;">Letzter Wurf: <strong>${letzterWurf}</strong></div>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${nutzerAmZug && mussWuerfeln && !state.gewinner ? `<button class="btn btn-primaer" data-spielzug="ludo" data-aktion="wuerfeln">🎲 Würfeln</button>` : ''}
          ${figurenButtons}
        </div>
      </div>
    `;
  },

  _renderWordgame(state, nutzerAmZug) {
    const eintraege = state.woerter.map((w, i) => {
      const sp = i % 2 === 0 ? 'Du' : 'Poke';
      const naechster = w[w.length - 1]?.toUpperCase();
      return `<div class="wort-eintrag"><span class="wort-spieler">${sp}:</span><span class="wort-text">${UI.escapeHtml(w)}</span>${i === state.woerter.length-1 ? `<span class="wort-buchstabe">→ Nächstes Wort mit ${naechster}</span>` : ''}</div>`;
    }).join('') || '<div style="color:var(--text-sekundaer);font-size:0.85rem;">Noch kein Wort. Du fängst an!</div>';

    const hinweis = state.letzterBuchstabe ? `Dein Wort muss mit <strong>${state.letzterBuchstabe.toUpperCase()}</strong> beginnen.` : 'Du kannst ein beliebiges Wort starten.';

    return `
      <div class="wort-verlauf">${eintraege}</div>
      <p style="font-size:0.85rem;color:var(--text-sekundaer);margin-bottom:10px;">${hinweis}</p>
      ${nutzerAmZug && !state.gewinner ? `
        <div style="display:flex;gap:10px;">
          <input type="text" id="wort-eingabe" class="formular-eingabe" placeholder="Dein Wort..." style="flex:1;">
          <button class="btn btn-primaer" data-spielzug="wordgame">Absenden</button>
        </div>
      ` : ''}
    `;
  },

  _boardEvents(spiel, nutzerAmZug) {
    if (!nutzerAmZug) return;

    // Connect4 Spalten-Buttons
    document.querySelectorAll('[data-spielzug="connect4"][data-spalte]').forEach(btn => {
      btn.addEventListener('click', () => this._sendeSpielerZug(spiel.id, { spalte: parseInt(btn.dataset.spalte) }));
    });

    // TicTacToe Felder
    document.querySelectorAll('.ttt-cell[data-spielzug="tictactoe"]').forEach(cell => {
      cell.addEventListener('click', () => {
        if (!cell.classList.contains('belegt')) this._sendeSpielerZug(spiel.id, { feld: parseInt(cell.dataset.feld) });
      });
    });

    // Battleship Zellen
    document.querySelectorAll('.bs-cell[data-spielzug="battleship"]').forEach(cell => {
      cell.addEventListener('click', () => this._sendeSpielerZug(spiel.id, { r: parseInt(cell.dataset.r), c: parseInt(cell.dataset.c) }));
    });

    // Ludo Würfeln + Figuren
    document.querySelectorAll('[data-spielzug="ludo"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const zug = btn.dataset.aktion ? { aktion: btn.dataset.aktion } : { figur: parseInt(btn.dataset.figur) };
        this._sendeSpielerZug(spiel.id, zug);
      });
    });

    // Wortspiel
    const wortBtn = document.querySelector('[data-spielzug="wordgame"]');
    if (wortBtn) {
      wortBtn.addEventListener('click', () => {
        const wort = document.getElementById('wort-eingabe')?.value?.trim();
        if (!wort) return;
        this._sendeSpielerZug(spiel.id, { wort });
      });
      document.getElementById('wort-eingabe')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') wortBtn.click();
      });
    }
  },

  async _sendeSpielerZug(spielId, zug) {
    try {
      const result = await API.anfrage('POST', `/games/${spielId}/zug`, { zug });
      this._aktivesSpiel = { ...this._aktivesSpiel, state: result.state, status: result.spielStatus };
      this._spielBoardRendern(this._aktivesSpiel);

      if (result.spielStatus === 'finished') {
        clearInterval(this._pollingInterval);
        await this.spieleLaden();
      }
    } catch (e) {
      UI.fehler(e.message);
    }
  },

  async _aufgeben(spielId) {
    if (!confirm('Willst du das Spiel wirklich aufgeben?')) return;
    try {
      await API.anfrage('DELETE', `/games/${spielId}`);
      clearInterval(this._pollingInterval);
      await this._zurueck();
    } catch (e) {
      UI.fehler(e.message);
    }
  },

  _zurueck() {
    clearInterval(this._pollingInterval);
    document.getElementById('spiel-board').style.display = 'none';
    document.getElementById('spiele-lobby').style.display = 'grid';
    document.getElementById('spiele-aktiv').style.display = 'block';
    this._aktivesSpiel = null;
    this.spieleLaden();
  },

  zerstoeren() {
    clearInterval(this._pollingInterval);
    if (this._sseListener) this._sseListener.close();
  }
};
