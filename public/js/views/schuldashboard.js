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
            </div>

            <!-- Rechte Spalte: Live-Feed -->
            <div class="karte feed-container schul-feed-karte">
              <h3 class="schul-feed-titel">
                <span class="pulsing-dot" style="width:10px; height:10px; background:#ef4444; border-radius:50%; display:inline-block; animation: pulse 2s infinite;"></span>
                Live-Feed
              </h3>
              <div id="schul-feed-inhalt" class="schul-feed-inhalt">
                <div class="lade-spinner"></div>
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
        .schul-feed-karte { height: calc(100vh - 150px); display: flex; flex-direction: column; position: sticky; top: 20px; }
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

    // Polling alle 30s für Daten, alle 60s für Abfahrten
    this._pollInterval = setInterval(() => this.datenLaden(true), 30000);
    this._opnvInterval = setInterval(() => this.abfahrtenLaden(true), 60000);
  },

  zerstoeren() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._opnvInterval) clearInterval(this._opnvInterval);
  },

  async datenLaden(silent = false) {
    try {
      const daten = await API.anfrage('GET', '/schuldashboard/daten');
      this._schulmodusAktiv = daten.schulmodusAktiv;
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
        <div class="aufgabe-item">
          <div class="zeit-badge">${faellig}</div>
          <div>
            <div style="font-weight:500;">${UI.escapeHtml(a.titel)}</div>
            ${a.notiz ? `<div style="font-size:0.85rem; color:var(--text-sekundaer); margin-top:2px;">${UI.escapeHtml(a.notiz)}</div>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
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

      if (!daten.abfahrten || daten.abfahrten.length === 0) {
        container.innerHTML = `<p style="color:var(--text-sekundaer); text-align:center; padding:10px 0;">Keine Abfahrten gefunden.</p>`;
        return;
      }

      const jetzt = new Date();
      const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();

      const zeilen = daten.abfahrten.map(ab => {
        const planTeile = ab.planZeit ? ab.planZeit.split(':').map(Number) : null;
        const planMin = planTeile ? planTeile[0] * 60 + planTeile[1] : null;
        const echtTeile = ab.echtZeit ? ab.echtZeit.split(':').map(Number) : null;
        const echtMin = echtTeile ? echtTeile[0] * 60 + echtTeile[1] : planMin;

        let restMin = echtMin !== null ? echtMin - jetztMin : null;
        // Mitternachts-Übergang abfangen
        if (restMin !== null && restMin < -120) restMin += 1440;

        const restText = restMin === null ? '?' : (restMin <= 0 ? 'Jetzt' : `${restMin} min`);
        let restKlasse = 'abfahrt-entspannt';
        if (restMin !== null && restMin <= 3) restKlasse = 'abfahrt-bald';
        else if (restMin !== null && restMin <= 10) restKlasse = 'abfahrt-bald-ok';

        const verspaetungHtml = ab.verspaetung > 0
          ? `<span class="abfahrt-verspaetet">+${ab.verspaetung}</span>`
          : (ab.echtZeit ? `<span class="abfahrt-puenktlich">✓</span>` : '');

        return `
          <tr>
            <td><span class="abfahrt-linie">${UI.escapeHtml(ab.linie)}</span></td>
            <td style="flex:1;">${UI.escapeHtml(ab.ziel)}</td>
            <td style="text-align:right; white-space:nowrap;">
              ${UI.escapeHtml(ab.planZeit || '?')} ${verspaetungHtml}
            </td>
            <td style="text-align:right; font-weight:600; padding-left:8px;" class="${restKlasse}">
              ${restText}
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-sekundaer); margin-bottom:6px;">📍 ${UI.escapeHtml(daten.haltestelle)}</div>
        <table class="abfahrt-tabelle"><tbody>${zeilen}</tbody></table>
      `;
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
        <input type="text" id="haltestelle-eingabe" class="formular-eingabe" placeholder="Haltestelle (z.B. Bielefeld Jahnplatz)">
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
        this.abfahrtenLaden();
      } catch (err) {
        container.innerHTML += `<div style="color:var(--farbe-gefahr); font-size:12px; margin-top:5px;">Nicht gefunden. Genaueren Namen versuchen.</div>`;
        UI.btnLaden(savBtn, false);
      }
    });
  },

  _haltestelleEingabeOeffnen() {
    UI.modalZeigen(`
      <div class="modal-header"><span class="modal-titel">Haltestelle ändern</span><button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button></div>
      <div class="modal-koerper">
        <div class="formular-gruppe">
          <label class="formular-label">Haltestellen-Name</label>
          <input type="text" id="haltestelle-modal-eingabe" class="formular-eingabe" placeholder="z. B. Bielefeld Jahnplatz">
        </div>
        <button class="btn btn-primaer btn-vollbreite" id="btn-haltestelle-modal-speichern">Speichern</button>
      </div>
    `);
    document.getElementById('btn-haltestelle-modal-speichern')?.addEventListener('click', async () => {
      const name = document.getElementById('haltestelle-modal-eingabe').value.trim();
      if (!name) return;
      try {
        const result = await API.anfrage('POST', '/schuldashboard/haltestelle', { name });
        UI.modalSchliessen();
        UI.erfolg(`Haltestelle gespeichert: ${result.name}`);
        this.abfahrtenLaden();
      } catch (err) {
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
