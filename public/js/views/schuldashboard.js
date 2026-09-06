// yRelay - Schul-Dashboard View
const SchulDashboardView = {
  rendern(nutzer) {
    const nameToDisplay = nutzer.anzeigename || nutzer.benutzername;
    const avatarBuchstabe = nameToDisplay[0].toUpperCase();
    const isMobile = window.innerWidth <= 768;

    return `
      <div class="seite haupt-seite schul-dashboard-seite">
        <!-- Navigation -->
        <nav class="navbar">
          <span class="navbar-logo" style="cursor: pointer; user-select: none;" onclick="window.location.hash='#dashboard'">
            <span class="logo-y">y</span><span class="logo-relay">Relay</span>
          </span>
          <div class="navbar-nav">
            <div class="nav-nutzer">
              <div class="nav-avatar">${UI.escapeHtml(avatarBuchstabe)}</div>
              <div class="nav-info">
                <span class="nav-name">${UI.escapeHtml(nameToDisplay)}</span>
                <span class="nav-rolle">Nutzer</span>
              </div>
            </div>
            <button class="btn btn-sekundaer btn-klein" onclick="window.location.hash='#dashboard'" title="Zum normalen Dashboard">📊 Chat</button>
            ${nutzer.rolle === 'admin' ? '<button class="btn btn-primaer btn-klein" onclick="window.location.hash=\'#admin\'" title="Admin Panel">🛠️ Admin</button>' : ''}
            <button class="btn btn-ghost btn-klein" id="abmelden-btn">Abmelden</button>
          </div>
        </nav>

        <main class="hauptinhalt schul-dashboard-inhalt">
          <div class="sektion-titel schul-dashboard-kopf">
            <div>🎒 Schul-Dashboard <span id="schulzeit-hinweis" class="text-gedaempft"></span></div>
            <div class="schulmodus-toggle">
              <button id="integration-btn" class="btn btn-ghost btn-klein" title="Poke-Integration anzeigen">🔗 Integration</button>
              <button id="auto-modus-btn" class="btn btn-ghost btn-klein" title="Automatischen Zeitplan verwenden">⏱️ Auto</button>
              <span id="modus-status-badge" class="status-badge" style="background:var(--text-sekundaer);">Modus: Inaktiv</span>
              <button id="toggle-modus-btn" class="btn btn-sekundaer btn-klein">Aktivieren</button>
            </div>
          </div>

          <div id="schul-layout" class="schul-grid">
            
            <!-- Linke Spalte: Widgets (Kalender & Aufgaben) -->
            <div class="widgets-container">
              <div class="karte schul-widget">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-erfolg">📚 Stundenplan</h3>
                </div>
                <div id="schul-stundenplan-inhalt" class="widget-inhalt">
                  <div class="lade-spinner"></div>
                </div>
              </div>
              <div class="karte schul-widget schul-wetter-karte">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-wetter">☀️ Wetter</h3>
                  <button class="btn btn-ghost btn-klein" id="btn-wetter-ort" style="display:none; margin-left: auto;" title="Ort ändern">⚙️</button>
                </div>
                <div id="schul-wetter-inhalt" class="widget-inhalt">Wetter wird geladen ...</div>
              </div>
              <div id="schul-kacheln" class="schul-kacheln"></div>
              
              <!-- Klausuren Widget -->
              <div class="karte schul-widget" id="schul-klausuren-widget" style="display: none; background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2);">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-notfall">⚠️ Nächste Klausur</h3>
                </div>
                <div id="schul-klausuren-inhalt" class="widget-inhalt">
                </div>
              </div>

              <!-- ÖPNV Widget -->
              <div class="karte schul-widget schul-opnv-karte">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-opnv">🚌 ÖPNV Abfahrten</h3>
                  <button class="btn btn-ghost btn-klein" id="btn-haltestelle-aendern" style="display:none; margin-left:auto;" title="Haltestelle ändern">⚙️</button>
                </div>
                <div id="schul-opnv-inhalt" class="widget-inhalt">Abfahrten werden geladen ...</div>
              </div>

              <!-- Kalender Widget -->
              <div class="karte schul-widget">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-primaer">📅 Heute</h3>
                  <button class="btn btn-sekundaer btn-klein btn-aktion" data-typ="termin">➕</button>
                </div>
                <div id="schul-kalender-inhalt" class="widget-inhalt">
                  <div class="lade-spinner"></div>
                </div>
              </div>

              <!-- Aufgaben Widget -->
              <div class="karte schul-widget">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-warnung">📋 Aufgaben</h3>
                  <button class="btn btn-sekundaer btn-klein btn-aktion" data-typ="aufgabe">➕</button>
                </div>
                <div id="schul-aufgaben-inhalt" class="widget-inhalt">
                  <div class="lade-spinner"></div>
                </div>
              </div>
              
              <!-- Schnelle Notiz -->
              <div class="karte schul-widget schul-notiz-widget">
                <h3 class="schul-widget-titel">📝 Schnelle Notiz</h3>
                <div class="schul-schnellnotiz">
                  <input type="text" id="schnell-notiz-input" class="formular-eingabe" placeholder="Notiz an Poke...">
                  <button id="schnell-notiz-btn" class="btn btn-primaer">Senden</button>
                </div>
              </div>

              <!-- Stille Pings Widget -->
              <div class="karte schul-widget schul-pings-karte" id="schul-pings-widget" style="display:none;">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-pings">
                    🔔 Gemerkt für später
                    <span id="ping-ungelesen-badge" class="ping-badge">0</span>
                  </h3>
                  <button class="btn btn-ghost btn-klein" id="btn-pings-gelesen" title="Alle als gelesen markieren" style="margin-left:auto; font-size:0.75rem;">✓ Alle</button>
                </div>
                <div id="schul-pings-inhalt" class="widget-inhalt"></div>
              </div>

              <!-- Pomodoro Timer Widget -->
              <div class="karte schul-widget schul-pomodoro-karte">
                <div class="schul-widget-kopf">
                  <h3 class="schul-widget-titel schul-widget-titel-pomodoro">⏱️ Fokus-Timer</h3>
                  <span id="pomodoro-session-count" style="font-size:0.8rem; color:var(--text-sekundaer); margin-left:auto;">0 / 4</span>
                </div>
                <div class="pomodoro-display">
                  <div id="pomodoro-modus" style="font-size:0.75rem; color:var(--text-sekundaer); text-transform:uppercase; letter-spacing:1px;">Fokus</div>
                  <div id="pomodoro-zeit" style="font-size:2.5rem; font-weight:bold; letter-spacing:2px; font-variant-numeric:tabular-nums;">25:00</div>
                </div>
                <div class="pomodoro-controls">
                  <button id="btn-pomodoro-start" class="btn btn-primaer btn-klein">▶ Start</button>
                  <button id="btn-pomodoro-skip" class="btn btn-ghost btn-klein" style="display:none;">⏭ Überspringen</button>
                  <button id="btn-pomodoro-reset" class="btn btn-ghost btn-klein">↺ Reset</button>
                </div>
              </div>

            </div>

            <!-- Rechte Spalte: Chat + Feed mit Tabs -->
            <div class="karte feed-container schul-feed-karte">
              <div class="schul-panel-tabs">
                <button class="schul-panel-tab aktiv" id="tab-chat" onclick="SchulDashboardView._tabWechseln('chat')">💬 Chat</button>
                <button class="schul-panel-tab" id="tab-feed" onclick="SchulDashboardView._tabWechseln('feed')">
                  <span class="pulsing-dot" style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;animation:pulse 2s infinite;"></span>
                  Feed
                </button>
                <button class="btn btn-ghost btn-klein" id="btn-chat-loeschen" title="Chat leeren" style="margin-left:auto; font-size:0.75rem;">🗑️</button>
              </div>

              <!-- Chat -->
              <div id="panel-chat" class="schul-panel-inhalt">
                <div id="schul-chat-nachrichten" class="schul-chat-nachrichten"></div>
                <div class="schul-chat-eingabe">
                  <input type="file" id="schul-chat-file" style="display:none;">
                  <button id="schul-chat-attach" class="btn btn-sekundaer schul-chat-btn" title="Datei anhängen (Pingvin Share)">📎</button>
                  <textarea id="schul-chat-input" class="formular-textarea schul-chat-textarea" placeholder="Schreib Poke etwas..." rows="2"></textarea>
                  <button id="schul-chat-senden" class="btn btn-primaer schul-chat-btn">➤</button>
                </div>
              </div>

              <!-- Feed -->
              <div id="panel-feed" class="schul-panel-inhalt" style="display:none;">
                <div id="schul-feed-inhalt" class="schul-feed-inhalt">
                  <div class="lade-spinner"></div>
                </div>
              </div>
            </div>
            
          </div>

          <div id="schul-inaktiv-meldung" class="schul-inaktiv-meldung">
            <div style="font-size:3rem; margin-bottom:20px;">😴</div>
            <h2>Der Schulmodus ist momentan inaktiv.</h2>
            <p style="color:var(--text-sekundaer); max-width:500px; margin:0 auto;">
              In diesem Modus werden Benachrichtigungen gepuffert und dein Kalender sowie deine Aufgaben übersichtlich dargestellt, ohne dich zu stören.
            </p>
          </div>
        </main>
      </div>
      
      <style>
        .schul-dashboard-kopf { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .schulmodus-toggle { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .schul-feed-karte { display: flex; flex-direction: column; position: sticky; top: 20px; align-self: stretch; }
        .schul-feed-titel { margin: 0 0 15px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
        .schul-feed-inhalt { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px; }
        .schul-schnellnotiz { display: flex; gap: 10px; }
        .schul-schnellnotiz .formular-eingabe { min-width: 0; }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .feed-item {
          padding: 12px;
          border-radius: var(--radius-klein);
          background: rgba(255,255,255,0.03);
          border-left: 3px solid var(--text-sekundaer);
          font-size: 0.95rem;
        }
        .feed-item.typ-email { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
        .feed-item.typ-info { border-color: #10b981; }
        .feed-item.typ-briefing { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
        .feed-item.typ-notfall { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .feed-zeit { font-size: 0.75rem; color: var(--text-sekundaer); margin-bottom: 4px; display:block; }
        .feed-inhalt { line-height: 1.65; overflow-wrap: anywhere; }
        .feed-inhalt h4 { margin: 10px 0 4px; color: var(--farbe-text); font-size: 1rem; }
        .feed-inhalt h4:first-child { margin-top: 0; }
        .feed-inhalt p { margin: 5px 0; }
        .feed-inhalt ul { margin: 6px 0 8px 20px; padding: 0; }
        .feed-inhalt li { margin: 3px 0; }
        .feed-inhalt code { padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,0.25); color: #fbbf24; }
        
        .kalender-item, .aufgabe-item {
          display:flex; align-items:flex-start; gap:10px;
          padding: 10px; border-bottom: 1px solid var(--rahmen);
        }
        .kalender-item:last-child, .aufgabe-item:last-child { border-bottom: none; }
        .zeit-badge {
          background: rgba(59, 130, 246, 0.1); color: #3b82f6;
          padding: 4px 8px; border-radius: 4px; font-weight: 500; font-size: 0.85rem;
          white-space: nowrap;
        }
        .aufgabe-item .zeit-badge {
          background: rgba(245, 158, 11, 0.1); color: #f59e0b;
        }
        .aufgabe-checkbox { cursor: pointer; width: 18px; height: 18px; margin-top: 2px; accent-color: var(--farbe-primaer); }
        .aufgabe-item.erledigt .aufgabe-text { opacity: 0.5; text-decoration: line-through; }

        .abfahrt-tabelle { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .abfahrt-tabelle td { padding: 7px 5px; border-bottom: 1px solid var(--rahmen); vertical-align: middle; }
        .abfahrt-tabelle tr:last-child td { border-bottom: none; }
        .abfahrt-linie {
          font-weight: bold; font-size: 0.85rem;
          display: inline-block; padding: 2px 7px; border-radius: 4px;
          background: rgba(99, 102, 241, 0.15); color: #818cf8;
          white-space: nowrap;
        }
        .abfahrt-verspaetet { color: #f87171; font-weight: 600; }
        .abfahrt-puenktlich { color: #34d399; }
        .abfahrt-bald { color: #f87171; font-weight: bold; }
        .abfahrt-bald-ok { color: #f59e0b; }
        .abfahrt-entspannt { color: #34d399; }

        /* Panel Tabs (Chat/Feed) */
        .schul-panel-tabs { display:flex; gap:6px; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--rahmen); padding-bottom:10px; }
        .schul-panel-tab { background:none; border:none; padding:5px 12px; border-radius: var(--radius-klein); color:var(--text-sekundaer); cursor:pointer; font-size:0.9rem; font-family: inherit; transition: all 0.15s; display:flex; align-items:center; gap:5px; }
        .schul-panel-tab.aktiv { background: rgba(99,102,241,0.15); color: #818cf8; font-weight:600; }
        .schul-panel-tab:hover:not(.aktiv) { background: var(--eingabe-hintergrund); }
        .schul-panel-inhalt { display:flex; flex-direction:column; flex:1; min-height:0; }

        /* Chat */
        .schul-chat-nachrichten { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding: 10px 4px; min-height:0; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .chat-bubble { 
          max-width:85%; padding:12px 16px; border-radius:20px; 
          line-height:1.5; font-size:0.95rem; word-break:break-word;
          animation: fadeInUp 0.3s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .chat-bubble.nutzer { 
          align-self:flex-end; 
          background:linear-gradient(135deg, #4f46e5, #7c3aed); 
          color:#fff; 
          border-bottom-right-radius:4px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        
        .chat-bubble.poke { 
          align-self:flex-start; 
          background:rgba(30, 41, 59, 0.75); 
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border:1px solid rgba(255,255,255,0.08); 
          color:var(--farbe-text); 
          border-bottom-left-radius:4px; 
        }
        
        .chat-bubble .chat-zeit { font-size:0.7rem; opacity:0.6; margin-top:6px; display:block; letter-spacing: 0.5px; }
        .chat-bubble.nutzer .chat-zeit { text-align:right; color: rgba(255,255,255,0.8); }
        
        /* Chat Input Area */
        .schul-chat-eingabe { 
          display:flex; gap:10px; margin-top:10px; align-items:flex-end; 
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--rahmen);
          padding: 10px; 
          border-radius: 24px;
          flex-shrink:0; 
        }
        
        .schul-dashboard-inhalt { max-width: 1500px !important; }
        
        .schul-chat-textarea { 
          flex:1; min-width:0; resize:none; min-height:42px; max-height:120px; 
          font-size:0.95rem; background: transparent; border: none; box-shadow: none; 
          padding: 10px 4px; color: #fff;
        }
        .schul-chat-textarea:focus { box-shadow: none; border: none; background: transparent; }
        
        .schul-chat-btn { 
          padding:0; width:42px; height:42px; flex-shrink:0; 
          display:flex; align-items:center; justify-content:center; 
          border-radius:50%; font-size:1.2rem; transition: all 0.2s;
        }
        .schul-chat-btn.btn-primaer {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
        }
        .schul-chat-btn.btn-primaer:hover { transform: scale(1.05); }
        .schul-chat-btn.btn-sekundaer {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        }
        .schul-chat-btn.btn-sekundaer:hover { background: rgba(255,255,255,0.1); }
        
        .chat-typing { 
          align-self:flex-start; padding:12px 18px; border-radius:20px; border-bottom-left-radius:4px; 
          background:rgba(30, 41, 59, 0.5); border:1px solid rgba(255,255,255,0.05);
        }
        .chat-typing span { display:inline-block; width:6px; height:6px; background:var(--text-sekundaer); border-radius:50%; animation: typing 1.2s ease-in-out infinite; margin:0 2px; }
        .chat-typing span:nth-child(2) { animation-delay:0.2s; }
        .chat-typing span:nth-child(3) { animation-delay:0.4s; }
        @keyframes typing { 0%, 100% { transform:translateY(0); } 50% { transform:translateY(-5px); background: #8b5cf6; } }


        /* Pomodoro */
        .pomodoro-display { text-align:center; padding:10px 0 8px; }
        .pomodoro-controls { display:flex; gap:8px; justify-content:center; }

        /* Stille Pings */
        .ping-badge { display:inline-flex; align-items:center; justify-content:center; background:#f59e0b; color:#000; border-radius:999px; font-size:0.7rem; font-weight:700; min-width:18px; height:18px; padding:0 5px; margin-left:6px; vertical-align:middle; }
        .ping-item { display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--rahmen); }
        .ping-item:last-child { border-bottom:none; }
        .ping-item.gelesen { opacity:0.45; }
        .ping-inhalt { flex:1; font-size:0.88rem; line-height:1.5; }
        .ping-zeit { font-size:0.72rem; color:var(--text-sekundaer); white-space:nowrap; margin-top:2px; }
        .ping-ok { background:none; border:none; cursor:pointer; color:var(--text-sekundaer); font-size:1rem; padding:0 2px; transition:color 0.15s; }
        .ping-ok:hover { color:#34d399; }

        /* Wochenvorschau */
        .woche-tag { padding:6px 0; border-bottom:1px solid var(--rahmen); }
        .woche-tag:last-child { border-bottom:none; }
        .woche-tag-titel { font-size:0.8rem; color:var(--text-sekundaer); font-weight:600; margin-bottom:3px; text-transform:uppercase; }
        .woche-event { font-size:0.85rem; padding:2px 0; display:flex; gap:6px; align-items:center; }
        .woche-event-zeit { font-size:0.75rem; color:#3b82f6; white-space:nowrap; }
      </style>
    `;
  },

  async initialisieren(nutzer) {
    document.getElementById('abmelden-btn')?.addEventListener('click', () => App.abmelden());
    document.getElementById('mobile-abmelden-btn')?.addEventListener('click', () => App.abmelden());

    this._schulmodusAktiv = false;
    await this.datenLaden();
    this.wetterLaden();
    this.abfahrtenLaden();
    this._setupSSE();

    document.getElementById('integration-btn')?.addEventListener('click', async () => {
      try {
        const integration = await API.schulIntegrationLaden();
        UI.modalZeigen(`
          <div class="modal-header">
            <span class="modal-titel">🔗 Poke-Integration</span>
            <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
          </div>
          <div class="modal-koerper">
            <p>Diese Integration gehört zu deinem Schul-Dashboard und dem Poke-Profil <strong>${UI.escapeHtml(integration.profilName)}</strong>.</p>
            <div class="formular-gruppe">
              <label class="formular-label" for="schul-callback-url">Callback-URL für Poke</label>
              <input class="formular-eingabe" id="schul-callback-url" value="${UI.escapeHtml(integration.callbackUrl)}" readonly>
            </div>
            <button class="btn btn-primaer btn-vollbreite" id="schul-callback-kopieren">📋 URL kopieren</button>
            <p class="text-gedaempft" style="margin-top:12px;">Beim Aktivieren des Schulmodus bekommt Poke diese URL automatisch mit der API-Anleitung. Teile sie nur mit diesem Poke-Profil.</p>
          </div>
        `);
        document.getElementById('schul-callback-kopieren')?.addEventListener('click', async () => {
          await navigator.clipboard.writeText(integration.callbackUrl);
          UI.erfolg('Callback-URL kopiert.');
        });
      } catch (e) {
        UI.fehler(e.message);
      }
    });

    document.getElementById('auto-modus-btn')?.addEventListener('click', async () => {
      try {
        await API.anfrage('POST', '/schuldashboard/modus', { modus: 'auto' });
        await this.datenLaden();
        UI.erfolg('Automatischer Schulzeitplan aktiviert.');
      } catch (e) {
        UI.fehler(e.message);
      }
    });

    // Modus umschalten
    document.getElementById('toggle-modus-btn')?.addEventListener('click', async () => {
      const neuerStatus = !this._schulmodusAktiv;
      try {
        await API.anfrage('POST', '/schuldashboard/modus', { aktiv: neuerStatus });
        await this.datenLaden();
        UI.erfolg(neuerStatus ? 'Schulmodus aktiviert.' : 'Schulmodus deaktiviert.');
      } catch (e) {
        UI.fehler(e.message);
      }
    });

    // Schnelle Notiz
    document.getElementById('schnell-notiz-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('schnell-notiz-input');
      const text = input.value.trim();
      if (!text) return;
      
      const btn = document.getElementById('schnell-notiz-btn');
      UI.btnLaden(btn, true);
      try {
        await API.anfrage('POST', '/schuldashboard/aktion', { aktionTyp: 'notiz', daten: { text } });
        input.value = '';
        UI.erfolg('Notiz gesendet.');
      } catch (e) {
        UI.fehler(e.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Aktionen (Termin/Aufgabe)
    document.querySelectorAll('.btn-aktion').forEach(btn => {
      btn.addEventListener('click', () => {
        this.aktionModalOeffnen(btn.dataset.typ);
      });
    });

    document.getElementById('btn-wetter-ort')?.addEventListener('click', () => {
      UI.modalZeigen(`
        <div class="modal-header"><span class="modal-titel">Wetter-Ort ändern</span><button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button></div>
        <div class="modal-koerper">
          <div class="formular-gruppe">
            <label class="formular-label">Ort (Stadt oder PLZ)</label>
            <input type="text" id="wetter-ort-modal" class="formular-eingabe" placeholder="z. B. Paderborn">
          </div>
          <button class="btn btn-primaer btn-vollbreite" id="btn-wetter-modal-speichern">Speichern</button>
        </div>
      `);
      document.getElementById('btn-wetter-modal-speichern')?.addEventListener('click', async () => {
        const ort = document.getElementById('wetter-ort-modal').value;
        if (!ort) return;
        try {
          await API.anfrage('POST', '/schuldashboard/wetterort', { ort });
          UI.modalSchliessen();
          this.wetterLaden();
        } catch (err) {
          UI.fehler(err.message);
        }
      });
    });

    document.getElementById('btn-haltestelle-aendern')?.addEventListener('click', () => {
      this._haltestelleEingabeOeffnen();
    });

    // Chat senden
    const chatSenden = async () => {
      const input = document.getElementById('schul-chat-input');
      const nachricht = input?.value.trim();
      if (!nachricht) return;
      const btn = document.getElementById('schul-chat-senden');
      UI.btnLaden(btn, true);
      input.value = '';
      // Sofort in UI einfügen
      this._chatNachrichtAppenden({ absender: 'nutzer', inhalt: nachricht, zeitpunkt: new Date().toISOString() });
      this._chatTypingZeigen(true);
      try {
        await API.anfrage('POST', '/schuldashboard/chat', { nachricht });
      } catch (e) {
        UI.fehler(e.message);
      } finally {
        UI.btnLaden(btn, false);
        this._chatTypingZeigen(false);
      }
    };
    document.getElementById('schul-chat-senden')?.addEventListener('click', chatSenden);
    document.getElementById('schul-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSenden(); }
    });

    const fileInput = document.getElementById('schul-chat-file');
    const attachBtn = document.getElementById('schul-chat-attach');
    
    attachBtn?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const btnIcon = attachBtn.innerHTML;
      attachBtn.innerHTML = '⏳';
      attachBtn.disabled = true;
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/schuldashboard/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${App.token}` },
          body: formData
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.fehler || 'Upload fehlgeschlagen');
        
        // Nachricht wird vom Backend auch an Poke gesendet und in die DB gespeichert.
        // Wir pushen sie direkt in die UI.
        this._chatNachrichtAppenden({ absender: 'nutzer', inhalt: data.text, zeitpunkt: new Date().toISOString() });
        UI.erfolg('Datei erfolgreich hochgeladen und geteilt.');
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        fileInput.value = '';
        attachBtn.innerHTML = btnIcon;
        attachBtn.disabled = false;
      }
    });

    // Chat leeren
    document.getElementById('btn-chat-loeschen')?.addEventListener('click', async () => {
      if (!confirm('Gesamten Chat-Verlauf wirklich löschen?')) return;
      try {
        await API.anfrage('DELETE', '/schuldashboard/chat');
        document.getElementById('schul-chat-nachrichten').innerHTML = '<div class="text-gedaempft" style="text-align:center; margin-top:20px;">Chat geleert.</div>';
      } catch (e) {
        UI.fehler(e.message);
      }
    });

    document.getElementById('btn-pings-gelesen')?.addEventListener('click', async () => {
      try {
        await API.anfrage('DELETE', '/schuldashboard/pings');
        document.querySelectorAll('.ping-item').forEach(el => el.remove());
        await this.datenLaden(true);
      } catch (e) { UI.fehler(e.message); }
    });

    // Pomodoro initialisieren
    this._pomodoroInitialisieren();

    // Polling alle 30s für Daten, alle 60s für Abfahrten
    this._pollInterval = setInterval(() => this.datenLaden(true), 30000);
    this._opnvInterval = setInterval(() => this.abfahrtenLaden(true), 60000);
  },

  zerstoeren() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._opnvInterval) clearInterval(this._opnvInterval);
    if (this._pomodoroTimer) clearInterval(this._pomodoroTimer);
  },

  async datenLaden(silent = false) {
    try {
      const daten = await API.anfrage('GET', '/schuldashboard/daten');
      this._schulmodusAktiv = daten.schulmodusAktiv;
      this._letzteHaltestellen = daten.haltestellen || [];
      this._letzteNaheHaltestellen = daten.naheHaltestellen || false;
      this.uiAktualisieren(daten);
    } catch (e) {
      if (!silent) console.error('Fehler beim Laden des Schul-Dashboards:', e);
    }
  },

  uiAktualisieren(daten) {
    const badge = document.getElementById('modus-status-badge');
    const btn = document.getElementById('toggle-modus-btn');
    const layout = document.getElementById('schul-layout');
    const meldung = document.getElementById('schul-inaktiv-meldung');
    const autoButton = document.getElementById('auto-modus-btn');

    if (autoButton) autoButton.style.display = daten.modus === 'auto' ? 'none' : '';

    if (this._schulmodusAktiv) {
      badge.textContent = 'Modus: Aktiv';
      badge.style.background = '#10b981';
      btn.textContent = 'Deaktivieren';
      btn.className = 'btn btn-gefahr btn-klein';
      layout.style.display = 'grid';
      meldung.style.display = 'none';
      
      this.rendereKalender(daten.kalender);
      this.rendereAufgaben(daten.aufgaben);
      this.rendereStundenplan(daten.stundenplan);
      this.rendereKacheln(daten.kacheln);
      this.rendereFeed(daten.feed);
      this.rendereKlausuren(daten.klausuren);
      this.rendereChat(daten.chat || []);
      this.rendereWocheKalender(daten.wocheKalender || []);
      this.renderePings(daten.pings || []);
    } else {
      badge.textContent = 'Modus: Inaktiv';
      badge.style.background = 'var(--text-sekundaer)';
      btn.textContent = 'Aktivieren';
      btn.className = 'btn btn-sekundaer btn-klein';
      layout.style.display = 'none';
      meldung.style.display = 'block';
    }
  },

  formatTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  },

  rendereKlausuren(items) {
    const widget = document.getElementById('schul-klausuren-widget');
    const container = document.getElementById('schul-klausuren-inhalt');
    if (!widget || !container) return;
    if (!items || items.length === 0) {
      widget.style.display = 'none';
      return;
    }
    
    items.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    const naechste = items[0];
    const jetzt = new Date();
    jetzt.setHours(0, 0, 0, 0);
    const klausurDatum = new Date(naechste.datum);
    klausurDatum.setHours(0, 0, 0, 0);
    const diffTime = klausurDatum - jetzt;
    const diffTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffTage < 0) {
      widget.style.display = 'none';
      return;
    }

    widget.style.display = 'block';
    const alarmFarbe = diffTage <= 3 ? 'color: var(--farbe-gefahr); font-weight: bold;' : 'color: var(--farbe-warnung); font-weight: bold;';
    
    container.innerHTML = `
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 1.2rem; margin-bottom: 5px;">${UI.escapeHtml(naechste.titel)}</div>
        <div style="font-size: 1.5rem; ${alarmFarbe}">
          ${diffTage === 0 ? 'Heute!' : (diffTage === 1 ? 'Morgen!' : `Noch ${diffTage} Tage`)}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-sekundaer); margin-top: 5px;">
          Am ${klausurDatum.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>
    `;
  },

  _tabWechseln(tab) {
    document.getElementById('panel-chat').style.display = tab === 'chat' ? 'flex' : 'none';
    document.getElementById('panel-feed').style.display = tab === 'feed' ? 'flex' : 'none';
    document.getElementById('tab-chat').classList.toggle('aktiv', tab === 'chat');
    document.getElementById('tab-feed').classList.toggle('aktiv', tab === 'feed');
  },

  rendereChat(items) {
    const container = document.getElementById('schul-chat-nachrichten');
    if (!container) return;
    // Nur komplett neu rendern wenn container leer (beim ersten Laden)
    if (container.children.length > 0) return;
    if (!items || items.length === 0) {
      container.innerHTML = `<p style="color:var(--text-sekundaer); text-align:center; font-size:0.9rem; margin-top:30px;">Schreib Poke etwas - er antwortet direkt hier. 💬</p>`;
      return;
    }
    items.forEach(msg => this._chatNachrichtAppenden(msg));
  },

  _chatNachrichtAppenden(msg) {
    const container = document.getElementById('schul-chat-nachrichten');
    if (!container) return;
    // Platzhalter entfernen falls vorhanden
    const placeholder = container.querySelector('p');
    if (placeholder) placeholder.remove();

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.absender}`;
    const zeit = new Date(msg.zeitpunkt + (msg.zeitpunkt.includes('Z') ? '' : 'Z'));
    const zeitStr = zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const inhalt = msg.absender === 'poke'
      ? this.markdownSicherRendern(msg.inhalt)
      : `<span>${UI.escapeHtml(msg.inhalt)}</span>`;
    bubble.innerHTML = `${inhalt}<span class="chat-zeit">${zeitStr}</span>`;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  },

  _chatTypingZeigen(zeigen) {
    const container = document.getElementById('schul-chat-nachrichten');
    if (!container) return;
    const existing = container.querySelector('.chat-typing');
    if (zeigen && !existing) {
      const typing = document.createElement('div');
      typing.className = 'chat-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;
    } else if (!zeigen && existing) {
      existing.remove();
    }
  },

  rendereWocheKalender(items) {
    // Wochenvorschau im Kalender-Widget ergänzen falls vorhanden
    const container = document.getElementById('schul-kalender-inhalt');
    if (!container || !items || items.length === 0) return;

    // Nur anfügen, wenn heute keine Einträge schon angezeigt werden ODER auch wenn schon was da ist
    const tage = {};
    items.forEach(t => {
      const datum = t.start.slice(0, 10);
      if (!tage[datum]) tage[datum] = [];
      tage[datum].push(t);
    });

    if (Object.keys(tage).length === 0) return;

    let wocheHtml = `<div style="margin-top:10px; border-top:1px solid var(--rahmen); padding-top:8px;"><div style="font-size:0.75rem; color:var(--text-sekundaer); font-weight:600; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">Diese Woche</div>`;
    Object.entries(tage).forEach(([datum, termine]) => {
      const d = new Date(datum + 'T12:00:00');
      const tagName = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      wocheHtml += `<div class="woche-tag"><div class="woche-tag-titel">${tagName}</div>`;
      termine.forEach(t => {
        const zeit = t.ganztaegig ? 'ganztägig' : t.start.slice(11, 16);
        wocheHtml += `<div class="woche-event"><span class="woche-event-zeit">${zeit}</span>${UI.escapeHtml(t.titel)}</div>`;
      });
      wocheHtml += `</div>`;
    });
    wocheHtml += `</div>`;
    container.insertAdjacentHTML('beforeend', wocheHtml);
  },

  renderePings(items) {
    const widget = document.getElementById('schul-pings-widget');
    const container = document.getElementById('schul-pings-inhalt');
    const badge = document.getElementById('ping-ungelesen-badge');
    if (!widget || !container) return;

    if (!items || items.length === 0) {
      widget.style.display = 'none';
      return;
    }

    widget.style.display = 'block';
    const ungelesen = items.filter(p => !p.gelesen).length;
    if (badge) {
      badge.textContent = ungelesen;
      badge.style.display = ungelesen > 0 ? 'inline-flex' : 'none';
    }

    container.innerHTML = items.map(ping => {
      const zeit = new Date(ping.zeitpunkt + (ping.zeitpunkt.includes('Z') ? '' : 'Z'));
      const zeitStr = zeit.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="ping-item ${ping.gelesen ? 'gelesen' : ''}" data-ping-id="${ping.id}">
          <div class="ping-inhalt">
            <div>${UI.escapeHtml(ping.inhalt)}</div>
            <div class="ping-zeit">${zeitStr}</div>
          </div>
          ${!ping.gelesen ? `<button class="ping-ok" title="Als gelesen markieren" onclick="SchulDashboardView._pingGelesen(${ping.id}, this)">✓</button>` : ''}
        </div>
      `;
    }).join('');
  },

  async _pingGelesen(id, btn) {
    try {
      await API.anfrage('PATCH', `/schuldashboard/pings/${id}/gelesen`);
      const item = btn?.closest('.ping-item');
      if (item) { item.classList.add('gelesen'); btn.remove(); }
      // Badge aktualisieren
      const ungelesen = document.querySelectorAll('.ping-item:not(.gelesen)').length;
      const badge = document.getElementById('ping-ungelesen-badge');
      if (badge) { badge.textContent = ungelesen; badge.style.display = ungelesen > 0 ? 'inline-flex' : 'none'; }
    } catch (e) { UI.fehler(e.message); }
  },

  _setupSSE() {
    if (this._eventSource) {
      this._eventSource.close();
    }
    const token = App.token || localStorage.getItem('yrelay_token');
    if (!token) return;

    this._eventSource = new EventSource('/api/schuldashboard/stream?token=' + encodeURIComponent(token));
    
    this._eventSource.addEventListener('update', () => {
      // Bei einem Update laden wir die Daten "leise" neu, um Flackern zu vermeiden
      this.datenLaden(true);
    });

    this._eventSource.addEventListener('error', (e) => {
      console.warn('[Schul-Dashboard] SSE-Verbindung unterbrochen. Versuche Reconnect...');
    });
  },

  // Pingvin Share Modal
  async _dateiAnhaengenDialog() {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">📎 Datei anhängen</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        <p>Wähle eine Datei aus, um sie hochzuladen und als Pingvin Share Link an Poke zu senden.</p>
        <div style="margin-top: 16px;">
          <input type="file" id="pingvin-file-input" class="formular-eingabe" style="margin-bottom: 16px;">
        </div>
        <button class="btn btn-primaer btn-vollbreite" id="btn-upload-file">Hochladen & Senden</button>
      </div>
    `);

    document.getElementById('btn-upload-file').addEventListener('click', async () => {
      const fileInput = document.getElementById('pingvin-file-input');
      if (!fileInput.files || fileInput.files.length === 0) {
        UI.fehler('Bitte wähle eine Datei aus.');
        return;
      }
      
      const file = fileInput.files[0];
      const btn = document.getElementById('btn-upload-file');
      UI.btnLaden(btn, true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/schuldashboard/upload', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + (App.token || localStorage.getItem('yrelay_token'))
          },
          body: formData
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.fehler || 'Upload fehlgeschlagen');

        UI.modalSchliessen();
        this.datenLaden(true);
      } catch (e) {
        UI.fehler(e.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },

  _pomodoroInitialisieren() {
    const ZEITEN = { fokus: 25 * 60, kurze_pause: 5 * 60, lange_pause: 15 * 60 };
    let modus = 'fokus';
    let restSekunden = ZEITEN.fokus;
    let laeuft = false;
    let sessionen = 0;

    const zeitEl = document.getElementById('pomodoro-zeit');
    const modusEl = document.getElementById('pomodoro-modus');
    const sessionEl = document.getElementById('pomodoro-session-count');
    const startBtn = document.getElementById('btn-pomodoro-start');
    const skipBtn = document.getElementById('btn-pomodoro-skip');
    const resetBtn = document.getElementById('btn-pomodoro-reset');
    if (!zeitEl || !startBtn) return;

    const anzeigenAktualisieren = () => {
      const min = Math.floor(restSekunden / 60).toString().padStart(2, '0');
      const sek = (restSekunden % 60).toString().padStart(2, '0');
      zeitEl.textContent = `${min}:${sek}`;
      modusEl.textContent = modus === 'fokus' ? 'Fokus' : (modus === 'kurze_pause' ? 'Kurze Pause' : 'Lange Pause');
      sessionEl.textContent = `${sessionen} / 4`;
      // Farbe je nach Modus
      zeitEl.style.color = modus === 'fokus' ? '#818cf8' : '#34d399';
    };

    const naechsterModus = () => {
      if (modus === 'fokus') {
        sessionen++;
        modus = sessionen % 4 === 0 ? 'lange_pause' : 'kurze_pause';
      } else {
        modus = 'fokus';
      }
      restSekunden = ZEITEN[modus];
      anzeigenAktualisieren();
    };

    startBtn.addEventListener('click', () => {
      laeuft = !laeuft;
      startBtn.textContent = laeuft ? '⏸ Pause' : '▶ Weiter';
      if (skipBtn) skipBtn.style.display = laeuft ? 'block' : 'none';
      if (!this._pomodoroTimer) {
        this._pomodoroTimer = setInterval(() => {
          if (!laeuft) return;
          restSekunden--;
          if (restSekunden <= 0) { naechsterModus(); laeuft = false; startBtn.textContent = '▶ Start'; if (skipBtn) skipBtn.style.display = 'none'; }
          anzeigenAktualisieren();
        }, 1000);
      }
    });

    skipBtn?.addEventListener('click', () => { naechsterModus(); laeuft = false; startBtn.textContent = '▶ Start'; skipBtn.style.display = 'none'; });
    resetBtn?.addEventListener('click', () => { laeuft = false; modus = 'fokus'; restSekunden = ZEITEN.fokus; sessionen = 0; startBtn.textContent = '▶ Start'; if (skipBtn) skipBtn.style.display = 'none'; anzeigenAktualisieren(); });
    anzeigenAktualisieren();
  },

  rendereKalender(items) {
    const container = document.getElementById('schul-kalender-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sekundaer); text-align:center; padding:20px 0;">Keine anstehenden Termine.</p>';
      return;
    }
    
    let html = '';
    items.forEach(t => {
      const zeit = t.ganztaegig ? 'Ganztägig' : `${this.formatTime(t.start)} ${t.ende ? '- ' + this.formatTime(t.ende) : ''}`;
      html += `
        <div class="kalender-item">
          <div class="zeit-badge">${zeit}</div>
          <div>
            <div style="font-weight:500;">${UI.escapeHtml(t.titel)}</div>
            ${t.notiz ? `<div style="font-size:0.85rem; color:var(--text-sekundaer); margin-top:2px;">${UI.escapeHtml(t.notiz)}</div>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  rendereStundenplan(items) {
    const container = document.getElementById('schul-stundenplan-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sekundaer); text-align:center; padding:20px 0;">Noch kein Stundenplan hinterlegt.</p>';
      return;
    }
    const heute = new Date().getDay() || 7;
    const tage = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const heuteItems = items.filter(stunde => Number(stunde.wochentag) === heute);
    if (heuteItems.length === 0) {
      container.innerHTML = `<p style="color:var(--text-sekundaer); text-align:center; padding:20px 0;">Heute kein Unterricht.</p>`;
      return;
    }
    container.innerHTML = heuteItems.map(stunde => `
      <div class="stundenplan-item">
        <div class="zeit-badge">${UI.escapeHtml(stunde.start)}${stunde.ende ? ` - ${UI.escapeHtml(stunde.ende)}` : ''}</div>
        <div><strong>${UI.escapeHtml(stunde.fach)}</strong><br>${[stunde.lehrer ? `Lehrer: ${stunde.lehrer}` : '', stunde.raum ? `Raum: ${stunde.raum}` : ''].filter(Boolean).map(wert => UI.escapeHtml(wert)).join(' · ')}</div>
      </div>
    `).join('');
  },

  rendereAufgaben(items) {
    const container = document.getElementById('schul-aufgaben-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sekundaer); text-align:center; padding:20px 0;">Alles erledigt! 🎉</p>';
      return;
    }
    
    let html = '';
    items.forEach(a => {
      const faellig = a.faellig ? this.formatTime(a.faellig) : 'Heute';
      html += `
        <div class="aufgabe-item ${a.erledigt ? 'erledigt' : ''}">
          <input type="checkbox" class="aufgabe-checkbox" ${a.erledigt ? 'checked' : ''} onchange="SchulDashboardView._aufgabeToggeln(${a.id}, this.checked)">
          <div class="zeit-badge">${faellig}</div>
          <div class="aufgabe-text">
            <div style="font-weight:500;">${UI.escapeHtml(a.titel)}</div>
            ${a.notiz ? `<div style="font-size:0.85rem; color:var(--text-sekundaer); margin-top:2px;">${UI.escapeHtml(a.notiz)}</div>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  async _aufgabeToggeln(id, erledigt) {
    try {
      await API.anfrage('PATCH', `/schuldashboard/aufgaben/${id}/erledigt`, { erledigt });
      this.datenLaden(true); // Neu laden für aktuelles Feedback
    } catch (e) {
      UI.fehler(e.message);
    }
  },

  rendereKacheln(kacheln) {
    const container = document.getElementById('schul-kacheln');
    if (!container) return;
    container.innerHTML = (kacheln || []).map(kachel => {
      const felder = Array.isArray(kachel.formular) ? kachel.formular : [];
      const formular = felder.length ? `
        <form class="schul-kachel-formular" data-kachel-id="${kachel.id}">
          ${felder.map(feld => {
            const required = feld.required ? 'required' : '';
            const label = UI.escapeHtml(feld.label);
            if (feld.type === 'textarea') return `<label class="formular-label">${label}<textarea name="${UI.escapeHtml(feld.name)}" class="formular-textarea" placeholder="${UI.escapeHtml(feld.placeholder || '')}" ${required}></textarea></label>`;
            if (feld.type === 'select') return `<label class="formular-label">${label}<select name="${UI.escapeHtml(feld.name)}" class="formular-select" ${required}><option value="">Auswählen ...</option>${feld.options.map(option => `<option value="${UI.escapeHtml(option)}">${UI.escapeHtml(option)}</option>`).join('')}</select></label>`;
            return `<label class="formular-label">${label}<input name="${UI.escapeHtml(feld.name)}" type="${UI.escapeHtml(feld.type)}" class="formular-eingabe" placeholder="${UI.escapeHtml(feld.placeholder || '')}" ${required}></label>`;
          }).join('')}
          <button type="submit" class="btn btn-sekundaer btn-klein">Absenden</button>
        </form>` : '';
      return `<article class="schul-kachel" style="--kachel-farbe:${UI.escapeHtml(kachel.farbe || '#6366f1')}">
        <div class="schul-kachel-kopf"><h3>${UI.escapeHtml(kachel.icon || '🧩')} ${UI.escapeHtml(kachel.titel)}</h3></div>
        <div class="schul-kachel-inhalt">${this.markdownSicherRendern(kachel.inhalt)}</div>${formular}
      </article>`;
    }).join('');
    container.querySelectorAll('.schul-kachel-formular').forEach(formular => {
      formular.addEventListener('submit', async event => {
        event.preventDefault();
        const werte = Object.fromEntries(new FormData(formular).entries());
        const button = formular.querySelector('button[type="submit"]');
        UI.btnLaden(button, true);
        try {
          await API.anfrage('POST', '/schuldashboard/aktion', { aktionTyp: 'kachel_formular', daten: { kachelId: formular.dataset.kachelId, werte } });
          formular.reset();
          UI.erfolg('Kachel-Formular an Poke gesendet.');
        } catch (error) {
          UI.fehler(error.message);
        } finally {
          UI.btnLaden(button, false);
        }
      });
    });
  },

  rendereFeed(items) {
    const container = document.getElementById('schul-feed-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sekundaer); text-align:center; padding:20px 0;">Noch keine Ereignisse.</p>';
      return;
    }
    
    let html = '';
    items.forEach(f => {
      const emoji = f.typ === 'email' ? '📧' : (f.typ === 'notfall' ? '🚨' : (f.typ === 'briefing' ? '🌅' : 'ℹ️'));
      const zeit = new Date(f.zeitpunkt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="feed-item typ-${UI.escapeHtml(f.typ)}">
          <span class="feed-zeit">${zeit}</span>
          <div class="feed-inhalt">${emoji} ${this.markdownSicherRendern(f.inhalt)}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  markdownSicherRendern(text) {
    const escaped = UI.escapeHtml(String(text || ''));
    const zeilen = escaped.split(/\r?\n/);
    const html = [];
    let listeOffen = false;
    const schliesseListe = () => {
      if (listeOffen) {
        html.push('</ul>');
        listeOffen = false;
      }
    };
    for (const zeile of zeilen) {
      const getext = zeile.trim();
      if (!getext) {
        schliesseListe();
        continue;
      }
      if (/^###\s+/.test(getext) || /^##\s+/.test(getext) || /^#\s+/.test(getext)) {
        schliesseListe();
        html.push(`<h4>${this.markdownInline(getext.replace(/^#{1,3}\s+/, ''))}</h4>`);
      } else if (/^[-*]\s+/.test(getext)) {
        if (!listeOffen) {
          html.push('<ul>');
          listeOffen = true;
        }
        html.push(`<li>${this.markdownInline(getext.replace(/^[-*]\s+/, ''))}</li>`);
      } else {
        schliesseListe();
        html.push(`<p>${this.markdownInline(zeile)}</p>`);
      }
    }
    schliesseListe();
    return html.join('');
  },

  markdownInline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
  },

  async wetterLaden() {
    const container = document.getElementById('schul-wetter-inhalt');
    const btn = document.getElementById('btn-wetter-ort');
    if (!container) return;
    try {
      const daten = await API.anfrage('GET', '/schuldashboard/wetter');
      const symbole = { 
        clear_sky: 'Klar', partly_cloudy: 'Teils bewölkt', cloudy: 'Bewölkt', fog: 'Nebel', 
        drizzle: 'Nieselregen', rain: 'Regen', showers: 'Schauer', thunderstorm: 'Gewitter', 
        snow: 'Schnee', sleet: 'Schneeregen', hail: 'Hagel', dry: 'Trocken'
      };
      
      const temperatur = daten.wetter.temperature !== undefined ? Math.round(daten.wetter.temperature) : '?';
      const zustand = daten.wetter.condition || 'unbekannt';
      
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size: 1.8rem; font-weight: bold;">${temperatur} °C</div>
          <div style="text-align: right;">
            <div style="font-weight: 500;">${UI.escapeHtml(daten.ort)}</div>
            <div style="font-size: 0.85rem; color: var(--text-sekundaer); text-transform: capitalize;">${symbole[zustand] || zustand.replace('_', ' ')}</div>
          </div>
        </div>
      `;
      if (btn) btn.style.display = 'block';
    } catch (e) {
      if (e.message.includes('Kein Wetter-Ort') || e.message.includes('Ort nicht gefunden')) {
        container.innerHTML = `
          <div style="display:flex; gap: 10px; margin-top: 5px;">
            <input type="text" id="wetter-ort-eingabe" class="formular-eingabe" placeholder="Stadt (z.B. Bielefeld)">
            <button class="btn btn-sekundaer" id="btn-wetter-speichern">OK</button>
          </div>
          ${e.message.includes('Ort nicht gefunden') ? '<div style="color:var(--farbe-gefahr); font-size:12px; margin-top:5px;">Ort nicht gefunden. Versuche es nochmal.</div>' : ''}
        `;
        document.getElementById('btn-wetter-speichern')?.addEventListener('click', async () => {
          const ort = document.getElementById('wetter-ort-eingabe').value;
          if (!ort) return;
          try {
            await API.anfrage('POST', '/schuldashboard/wetterort', { ort });
            this.wetterLaden();
          } catch (err) {
            UI.fehler(err.message);
          }
        });
        if (btn) btn.style.display = 'none';
      } else {
        container.textContent = 'Wetter momentan nicht verfügbar.';
        if (btn) btn.style.display = 'block';
      }
    }
  },

  async abfahrtenLaden(silent = false) {
    const container = document.getElementById('schul-opnv-inhalt');
    const btn = document.getElementById('btn-haltestelle-aendern');
    if (!container) return;
    try {
      const daten = await API.anfrage('GET', '/schuldashboard/abfahrten');
      if (btn) btn.style.display = 'block';

      if (!daten.stationen || daten.stationen.length === 0) {
        container.innerHTML = `<p style="color:var(--text-sekundaer); text-align:center; padding:10px 0;">Keine Abfahrten gefunden.</p>`;
        return;
      }

      const jetzt = new Date();
      const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
      
      let html = '';
      for (const station of daten.stationen) {
        html += `<div style="font-size:0.85rem; color:var(--text-sekundaer); margin-bottom:6px; margin-top:10px; font-weight:600;">📍 ${UI.escapeHtml(station.haltestelle)}</div>`;
        
        if (!station.abfahrten || station.abfahrten.length === 0) {
          html += `<div style="font-size:0.8rem; color:var(--text-sekundaer);">Keine Abfahrten.</div>`;
          continue;
        }

        const zeilen = station.abfahrten.map(ab => {
          const planTeile = ab.planZeit ? ab.planZeit.split(':').map(Number) : null;
          const planMin = planTeile ? planTeile[0] * 60 + planTeile[1] : null;
          const echtTeile = ab.echtZeit ? ab.echtZeit.split(':').map(Number) : null;
          const echtMin = echtTeile ? echtTeile[0] * 60 + echtTeile[1] : planMin;

          let restMin = echtMin !== null ? echtMin - jetztMin : null;
          if (restMin !== null && restMin < -120) restMin += 1440;

          const restText = restMin === null ? '?' : (restMin <= 0 ? 'Jetzt' : `${restMin} min`);
          let restKlasse = 'abfahrt-entspannt';
          if (restMin !== null && restMin <= 3) restKlasse = 'abfahrt-bald';
          else if (restMin !== null && restMin <= 10) restKlasse = 'abfahrt-bald-ok';

          const verspaetungHtml = ab.verspaetung > 0
            ? `<span class="abfahrt-verspaetet">+${ab.verspaetung}</span>`
            : (ab.echtZeit ? `<span class="abfahrt-puenktlich">✓</span>` : '');
            
          const ortHinweis = ab.abfahrtsOrt && ab.abfahrtsOrt !== station.haltestelle ? `<div style="font-size:0.7rem; color:var(--text-sekundaer); margin-top:-2px;">${UI.escapeHtml(ab.abfahrtsOrt)}</div>` : '';

          return `
            <tr>
              <td style="width:1%;"><span class="abfahrt-linie">${UI.escapeHtml(ab.linie)}</span></td>
              <td style="flex:1;">${UI.escapeHtml(ab.ziel)}${ortHinweis}</td>
              <td style="text-align:right; white-space:nowrap; width:1%;">
                ${UI.escapeHtml(ab.planZeit || '?')} ${verspaetungHtml}
              </td>
              <td style="text-align:right; font-weight:600; padding-left:8px; width:1%;" class="${restKlasse}">
                ${restText}
              </td>
            </tr>
          `;
        }).join('');
        html += `<table class="abfahrt-tabelle"><tbody>${zeilen}</tbody></table>`;
      }

      container.innerHTML = html;
    } catch (e) {
      if (e.message.includes('Keine Haltestelle')) {
        this._haltestelleEingabeRendern(container, btn);
      } else if (!silent) {
        container.textContent = 'Abfahrten momentan nicht verfügbar.';
        if (btn) btn.style.display = 'block';
      }
    }
  },

  _haltestelleEingabeRendern(container, btn) {
    if (btn) btn.style.display = 'none';
    container.innerHTML = `
      <div style="display:flex; gap:10px; margin-top:5px;">
        <input type="text" id="haltestelle-eingabe" class="formular-eingabe" placeholder="Haltestelle hinzufügen...">
        <button class="btn btn-sekundaer" id="btn-haltestelle-speichern">OK</button>
      </div>
    `;
    document.getElementById('btn-haltestelle-speichern')?.addEventListener('click', async () => {
      const name = document.getElementById('haltestelle-eingabe').value.trim();
      if (!name) return;
      const savBtn = document.getElementById('btn-haltestelle-speichern');
      UI.btnLaden(savBtn, true);
      try {
        const result = await API.anfrage('POST', '/schuldashboard/haltestelle', { name });
        UI.erfolg(`Haltestelle gespeichert: ${result.name}`);
        this.datenLaden(true); // Für interne Flags
        this.abfahrtenLaden();
      } catch (err) {
        container.innerHTML += `<div style="color:var(--farbe-gefahr); font-size:12px; margin-top:5px;">Nicht gefunden. Genaueren Namen versuchen.</div>`;
        UI.btnLaden(savBtn, false);
      }
    });
  },

  _haltestelleEingabeOeffnen() {
    const listHtml = (this._letzteHaltestellen || []).map(h => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:4px;">
        <span>${UI.escapeHtml(h.name)}</span>
        <button class="btn btn-ghost btn-klein btn-haltestelle-loeschen" data-id="${h.id}">🗑️</button>
      </div>
    `).join('') || '<div style="color:var(--text-sekundaer); margin-bottom:10px;">Keine Haltestellen gespeichert.</div>';

    UI.modalZeigen(`
      <div class="modal-header"><span class="modal-titel">Haltestellen verwalten</span><button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button></div>
      <div class="modal-koerper">
        <div style="margin-bottom:15px; max-height:150px; overflow-y:auto;">
          ${listHtml}
        </div>
        
        <div class="formular-gruppe">
          <label class="formular-label">Neue Haltestelle hinzufügen</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="haltestelle-modal-eingabe" class="formular-eingabe" placeholder="z. B. Bielefeld Jahnplatz">
            <button class="btn btn-primaer" id="btn-haltestelle-modal-speichern">Suchen</button>
          </div>
        </div>
        
        <div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--rahmen);">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" id="check-nahe-haltestellen" ${this._letzteNaheHaltestellen ? 'checked' : ''}>
            <span>Nahegelegene Haltestellen (Unterstationen) automatisch miteinbeziehen</span>
          </label>
        </div>
      </div>
    `);
    
    // Löschen
    document.querySelectorAll('.btn-haltestelle-loeschen').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
          await API.anfrage('DELETE', '/schuldashboard/haltestelle/' + id);
          UI.erfolg('Haltestelle entfernt.');
          await this.datenLaden(true);
          this.abfahrtenLaden();
          if (this._letzteHaltestellen.length > 0) this._haltestelleEingabeOeffnen(); // Refresh Modal
          else UI.modalSchliessen();
        } catch (err) { UI.fehler(err.message); }
      });
    });

    // Hinzufügen
    document.getElementById('btn-haltestelle-modal-speichern')?.addEventListener('click', async () => {
      const name = document.getElementById('haltestelle-modal-eingabe').value.trim();
      if (!name) return;
      const savBtn = document.getElementById('btn-haltestelle-modal-speichern');
      UI.btnLaden(savBtn, true);
      try {
        const result = await API.anfrage('POST', '/schuldashboard/haltestelle', { name });
        UI.erfolg(`Haltestelle hinzugefügt: ${result.name}`);
        await this.datenLaden(true);
        this.abfahrtenLaden();
        this._haltestelleEingabeOeffnen(); // Refresh Modal
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(savBtn, false);
      }
    });

    // Nahe Haltestellen Toggle
    document.getElementById('check-nahe-haltestellen')?.addEventListener('change', async (e) => {
      try {
        await API.anfrage('POST', '/schuldashboard/nahe-haltestellen', { aktiv: e.target.checked });
        this._letzteNaheHaltestellen = e.target.checked;
        this.abfahrtenLaden(); // Refresh
      } catch (err) {
        e.target.checked = !e.target.checked; // Revert
        UI.fehler(err.message);
      }
    });
  },

  aktionModalOeffnen(typ) {
    const isTermin = typ === 'termin';
    const titel = isTermin ? 'Neuer Termin' : 'Neue Aufgabe';
    
    const html = `
      <form id="aktion-form" style="display:flex; flex-direction:column; gap:15px;">
        <div class="formular-gruppe">
          <label class="formular-label">Titel</label>
          <input type="text" id="aktion-titel" class="formular-eingabe" required>
        </div>
        
        ${isTermin ? `
          <div style="display:flex; gap:10px;">
            <div class="formular-gruppe" style="flex:1;">
              <label class="formular-label">Von (Uhrzeit)</label>
              <input type="time" id="aktion-start" class="formular-eingabe" required>
            </div>
            <div class="formular-gruppe" style="flex:1;">
              <label class="formular-label">Bis (Optional)</label>
              <input type="time" id="aktion-ende" class="formular-eingabe">
            </div>
          </div>
          <div class="formular-gruppe">
            <label class="formular-label">Standort (optional)</label>
            <input type="text" id="aktion-standort" class="formular-eingabe" placeholder="z. B. Raum 204">
          </div>
          <div class="formular-gruppe" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="aktion-ganztaegig">
            <label for="aktion-ganztaegig">Ganztägig</label>
          </div>
        ` : `
          <div class="formular-gruppe">
            <label class="formular-label">Fällig (Uhrzeit, Optional)</label>
            <input type="time" id="aktion-faellig" class="formular-eingabe">
          </div>
        `}
        
        <div class="formular-gruppe">
          <label class="formular-label">Zusätzliche Notiz an Poke (Optional)</label>
          <textarea id="aktion-notiz" class="formular-textarea" style="height:60px;"></textarea>
        </div>
        
        <button type="submit" class="btn btn-primaer">Speichern & an Poke senden</button>
      </form>
    `;
    
    UI.modalZeigen(`
      <div class="modal-header"><span class="modal-titel">${UI.escapeHtml(titel)}</span><button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button></div>
      <div class="modal-koerper">${html}</div>
    `);
    
    // UI Logik für Ganztägig
    if (isTermin) {
      document.getElementById('aktion-ganztaegig').addEventListener('change', (e) => {
        const start = document.getElementById('aktion-start');
        const ende = document.getElementById('aktion-ende');
        if (e.target.checked) {
          start.removeAttribute('required');
          start.disabled = true;
          ende.disabled = true;
        } else {
          start.setAttribute('required', 'required');
          start.disabled = false;
          ende.disabled = false;
        }
      });
    }

    document.getElementById('aktion-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      UI.btnLaden(btn, true);
      
      const daten = {
        titel: document.getElementById('aktion-titel').value,
        notiz: document.getElementById('aktion-notiz').value,
        standort: document.getElementById('aktion-standort')?.value || ''
      };
      
      if (isTermin) {
        daten.ganztaegig = document.getElementById('aktion-ganztaegig').checked;
        if (!daten.ganztaegig) {
          daten.start = document.getElementById('aktion-start').value;
          daten.ende = document.getElementById('aktion-ende').value;
        }
      } else {
        daten.faellig = document.getElementById('aktion-faellig').value;
      }
      
      try {
        await API.anfrage('POST', '/schuldashboard/aktion', { aktionTyp: typ, daten });
        UI.erfolg('Aktion erfolgreich an Poke übermittelt.');
        UI.schliesseModal();
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(btn, false);
      }
    });
  }
};
