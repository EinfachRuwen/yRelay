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
                </div>
                <div id="schul-wetter-inhalt" class="widget-inhalt">Wetter wird geladen ...</div>
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
        .feed-item.typ-notfall { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .feed-zeit { font-size: 0.75rem; color: var(--text-sekundaer); margin-bottom: 4px; display:block; }
        
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
      </style>
    `;
  },

  async initialisieren(nutzer) {
    document.getElementById('abmelden-btn')?.addEventListener('click', () => App.abmelden());
    document.getElementById('mobile-abmelden-btn')?.addEventListener('click', () => App.abmelden());

    this._schulmodusAktiv = false;
    await this.datenLaden();
    this.wetterLaden();

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

    // Polling alle 30s
    this._pollInterval = setInterval(() => this.datenLaden(true), 30000);
  },

  zerstoeren() {
    if (this._pollInterval) clearInterval(this._pollInterval);
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
      this.rendereFeed(daten.feed);
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
          <div>${emoji} ${UI.escapeHtml(f.inhalt)}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  async wetterLaden() {
    const container = document.getElementById('schul-wetter-inhalt');
    if (!container) return;
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.405&current=temperature_2m,weather_code&timezone=auto');
      if (!response.ok) throw new Error('Wetter nicht verfügbar');
      const daten = await response.json();
      const symbole = { 0: 'Klar', 1: 'Überwiegend klar', 2: 'Bewölkt', 3: 'Bedeckt', 45: 'Nebel', 61: 'Regen', 63: 'Regen', 65: 'Starker Regen', 71: 'Schnee', 80: 'Schauer', 95: 'Gewitter' };
      container.innerHTML = `<strong>${Math.round(daten.current.temperature_2m)} °C</strong> · ${symbole[daten.current.weather_code] || 'Aktuelles Wetter'}`;
    } catch (e) {
      container.textContent = 'Wetter momentan nicht verfügbar.';
    }
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
