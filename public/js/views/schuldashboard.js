// yRelay - Schul-Dashboard View
const SchulDashboardView = {
  rendern(nutzer) {
    const ic = (n) => UI.icon(n);
    const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const kopf = (icon, titel, extra = '') => `<div class="schul-widget-kopf"><h2 class="schul-widget-titel">${ic(icon)}${titel}</h2>${extra}</div>`;
    return `
      <div class="seite">
        ${UI.kopf(nutzer, 'schule')}

        <main class="inhalt schul-dashboard-inhalt">
          <div class="schultag-kopf">
            <div>
              <h1>Schultag</h1>
              <div class="datum">${heute} <span id="schulzeit-hinweis" class="text-gedaempft"></span></div>
            </div>
            <div class="schulmodus-toggle">
              <span id="modus-status-badge" class="modus-anzeige">Schulmodus aus</span>
              <button id="toggle-modus-btn" class="btn btn-primaer btn-klein">Einschalten</button>
              <button id="auto-modus-btn" class="btn btn-sekundaer btn-klein" title="Automatischen Zeitplan verwenden">${ic('uhr')}Nach Zeitplan</button>
              <button id="integration-btn" class="btn btn-ghost btn-klein" title="Agent-Integration anzeigen">${ic('link')}Integration</button>
            </div>
          </div>

          <div id="schul-layout" class="schul-grid">
            <div class="schul-spalte">
              <section class="karte schul-widget">
                ${kopf('stundenplan', 'Stundenplan heute')}
                <div id="schul-stundenplan-inhalt" class="widget-inhalt"><div class="lade-spinner"></div></div>
              </section>

              <section class="karte schul-widget">
                ${kopf('kalender', 'Termine', `<button class="btn btn-sekundaer btn-klein btn-icon btn-aktion" data-typ="termin" title="Termin hinzufügen" aria-label="Termin hinzufügen">${ic('plus')}</button>`)}
                <div id="schul-kalender-inhalt" class="widget-inhalt"><div class="lade-spinner"></div></div>
              </section>

              <section class="karte schul-widget">
                ${kopf('aufgaben', 'Aufgaben', `<button class="btn btn-sekundaer btn-klein btn-icon btn-aktion" data-typ="aufgabe" title="Aufgabe hinzufügen" aria-label="Aufgabe hinzufügen">${ic('plus')}</button>`)}
                <div id="schul-aufgaben-inhalt" class="widget-inhalt"><div class="lade-spinner"></div></div>
              </section>
            </div>

            <div class="schul-spalte">
              <section class="karte schul-widget" id="schul-klausuren-widget" style="display:none;">
                ${kopf('ziel', 'Nächste Klausur')}
                <div id="schul-klausuren-inhalt" class="widget-inhalt"></div>
              </section>

              <section class="karte schul-widget schul-opnv-karte">
                ${kopf('bus', 'Abfahrten', `<button class="btn btn-ghost btn-klein btn-icon" id="btn-haltestelle-aendern" style="display:none;" title="Haltestellen verwalten" aria-label="Haltestellen verwalten">${ic('zahnrad')}</button>`)}
                <div id="schul-opnv-inhalt" class="widget-inhalt">Abfahrten werden geladen …</div>
              </section>

              <section class="karte schul-widget schul-wetter-karte">
                ${kopf('wolkig', 'Wetter', `<button class="btn btn-ghost btn-klein btn-icon" id="btn-wetter-ort" style="display:none;" title="Ort ändern" aria-label="Ort ändern">${ic('zahnrad')}</button>`)}
                <div id="schul-wetter-inhalt" class="widget-inhalt">Wetter wird geladen …</div>
              </section>

              <div id="schul-kacheln" class="schul-kacheln"></div>

              <section class="karte schul-widget schul-pings-karte" id="schul-pings-widget" style="display:none;">
                ${kopf('glocke', 'Für später <span id="ping-ungelesen-badge" class="ping-badge">0</span>', `<button class="btn btn-ghost btn-klein" id="btn-pings-gelesen" title="Alle als gelesen markieren">${ic('haken')}Alle gelesen</button>`)}
                <div id="schul-pings-inhalt" class="widget-inhalt"></div>
              </section>

              <section class="karte schul-widget schul-notiz-widget">
                ${kopf('notiz', 'Schnelle Notiz')}
                <div class="schul-schnellnotiz">
                  <label class="sr-only" for="schnell-notiz-input">Notiz an den Agenten</label>
                  <input type="text" id="schnell-notiz-input" class="formular-eingabe" placeholder="Kurz notieren, der Agent merkt es sich">
                  <button id="schnell-notiz-btn" class="btn btn-primaer">Senden</button>
                </div>
              </section>

              <section class="karte schul-widget schul-pomodoro-karte">
                ${kopf('countdown', 'Fokus-Timer', `<span id="pomodoro-session-count" class="leise" style="margin-left:auto;">0 / 4</span>`)}
                <div class="pomodoro-display">
                  <div id="pomodoro-zeit">25:00</div>
                  <div id="pomodoro-modus" class="leise" style="font-weight:700">Fokus</div>
                </div>
                <div class="pomodoro-controls">
                  <button id="btn-pomodoro-start" class="btn btn-primaer btn-klein">Start</button>
                  <button id="btn-pomodoro-skip" class="btn btn-sekundaer btn-klein" style="display:none;">Überspringen</button>
                  <button id="btn-pomodoro-reset" class="btn btn-ghost btn-klein">Zurücksetzen</button>
                </div>
              </section>
            </div>

            <section class="karte feed-container schul-feed-karte" aria-label="Chat und Feed">
              <div class="schul-panel-tabs" role="tablist">
                <button class="schul-panel-tab aktiv" id="tab-chat" role="tab" onclick="SchulDashboardView._tabWechseln('chat')">${ic('chat')}Chat</button>
                <button class="schul-panel-tab" id="tab-feed" role="tab" onclick="SchulDashboardView._tabWechseln('feed')">${ic('feed')}Feed</button>
                <button class="btn btn-ghost btn-klein btn-icon" id="btn-chat-loeschen" title="Chat leeren" aria-label="Chat leeren">${ic('loeschen')}</button>
              </div>
              <div id="panel-chat" class="schul-panel-inhalt">
                <div id="schul-chat-nachrichten" class="schul-chat-nachrichten"></div>
                <div class="schul-chat-eingabe">
                  <input type="file" id="schul-chat-file" style="display:none;">
                  <button id="schul-chat-attach" class="btn btn-sekundaer schul-chat-btn" title="Datei anhängen" aria-label="Datei anhängen">${ic('anhang')}</button>
                  <label class="sr-only" for="schul-chat-input">Nachricht</label>
                  <textarea id="schul-chat-input" class="formular-textarea schul-chat-textarea" placeholder="Frag deinen Agenten …" rows="1"></textarea>
                  <button id="schul-chat-senden" class="btn btn-primaer schul-chat-btn" title="Senden" aria-label="Senden">${ic('senden')}</button>
                </div>
              </div>
              <div id="panel-feed" class="schul-panel-inhalt" style="display:none;">
                <div id="schul-feed-inhalt" class="schul-feed-inhalt"><div class="lade-spinner"></div></div>
              </div>
            </section>
          </div>

          <div id="schul-inaktiv-meldung" class="schul-inaktiv-meldung">
            <span class="leere-liste-icon">${ic('schule')}</span>
            <h2>Der Schulmodus ist aus.</h2>
            <p>Ist er an, puffert dein Agent Benachrichtigungen und zeigt dir Stundenplan, Termine und Aufgaben hier übersichtlich an, ohne dich zu stören.</p>
          </div>
        </main>
      </div>
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
          ${UI.modalKopf('Agent-Integration')}
          <div class="modal-koerper">
            <p>Diese Integration gehört zu deinem Schul-Dashboard und dem Poke-Profil <strong>${UI.escapeHtml(integration.profilName)}</strong>.</p>
            <div class="formular-gruppe">
              <label class="formular-label" for="schul-callback-url">Callback-URL für Poke</label>
              <input class="formular-eingabe" id="schul-callback-url" value="${UI.escapeHtml(integration.callbackUrl)}" readonly>
            </div>
            <button class="btn btn-primaer btn-vollbreite" id="schul-callback-kopieren">${UI.icon('kopieren')}URL kopieren</button>
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
        ${UI.modalKopf('Wetter-Ort ändern')}
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
      attachBtn.innerHTML = '<span class="btn-spinner"></span>';
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
      badge.textContent = daten.modus === 'auto' ? 'Schulmodus an · nach Zeitplan' : 'Schulmodus an';
      badge.classList.add('an');
      btn.textContent = 'Ausschalten';
      btn.className = 'btn btn-sekundaer btn-klein';
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
      badge.textContent = 'Schulmodus aus';
      badge.classList.remove('an');
      btn.textContent = 'Einschalten';
      btn.className = 'btn btn-primaer btn-klein';
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
    container.innerHTML = `
      <div class="klausur-zaehler">
        <div class="tage">${diffTage === 0 ? 'Heute' : diffTage}<small>${diffTage === 0 ? '' : (diffTage === 1 ? 'Tag' : 'Tage')}</small></div>
        <div>
          <div class="was">${UI.escapeHtml(naechste.titel)}</div>
          <div class="wann">${klausurDatum.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          ${items.length > 1 ? `<div class="wann">Danach: ${UI.escapeHtml(items[1].titel)}</div>` : ''}
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
      container.innerHTML = `<p class="leise" style="text-align:center; margin-top:30px;">Schreib deinem Agenten – die Antwort kommt hier.</p>`;
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

    let wocheHtml = `<div style="margin-top:12px;"><h3 style="font-size:17px; margin-bottom:2px;">Nächste Tage</h3>`;
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
          ${!ping.gelesen ? `<button class="ping-ok" title="Als gelesen markieren" onclick="SchulDashboardView._pingGelesen(${ping.id}, this)" aria-label="Als gelesen markieren">${UI.icon('haken')}</button>` : ''}
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
      ${UI.modalKopf('Datei anhängen')}
      <div class="modal-koerper">
        <p>Die Datei wird über Pingvin Share hochgeladen und als Link an deinen Agenten geschickt.</p>
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
      zeitEl.style.color = modus === 'fokus' ? 'var(--tinte)' : 'var(--gruen)';
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
      startBtn.textContent = laeuft ? 'Pause' : 'Weiter';
      if (skipBtn) skipBtn.style.display = laeuft ? 'block' : 'none';
      if (!this._pomodoroTimer) {
        this._pomodoroTimer = setInterval(() => {
          if (!laeuft) return;
          restSekunden--;
          if (restSekunden <= 0) { naechsterModus(); laeuft = false; startBtn.textContent = 'Start'; if (skipBtn) skipBtn.style.display = 'none'; }
          anzeigenAktualisieren();
        }, 1000);
      }
    });

    skipBtn?.addEventListener('click', () => { naechsterModus(); laeuft = false; startBtn.textContent = 'Start'; skipBtn.style.display = 'none'; });
    resetBtn?.addEventListener('click', () => { laeuft = false; modus = 'fokus'; restSekunden = ZEITEN.fokus; sessionen = 0; startBtn.textContent = 'Start'; if (skipBtn) skipBtn.style.display = 'none'; anzeigenAktualisieren(); });
    anzeigenAktualisieren();
  },

  rendereKalender(items) {
    const container = document.getElementById('schul-kalender-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="leise">Heute keine Termine.</p>';
      return;
    }
    
    let html = '';
    items.forEach(t => {
      const zeit = t.ganztaegig ? 'ganztägig' : `${this.formatTime(t.start)}${t.ende ? '–' + this.formatTime(t.ende) : ''}`;
      html += `
        <div class="kalender-item">
          <div class="zeit-badge">${zeit}</div>
          <div>
            <div style="font-weight:700;">${UI.escapeHtml(t.titel)}</div>
            ${t.notiz ? `<div class="leise" style="margin-top:2px;">${UI.escapeHtml(t.notiz)}</div>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  rendereStundenplan(items) {
    const container = document.getElementById('schul-stundenplan-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="leise">Noch kein Stundenplan hinterlegt.</p>';
      return;
    }
    const heute = new Date().getDay() || 7;
    const heuteItems = items.filter(stunde => Number(stunde.wochentag) === heute);
    if (heuteItems.length === 0) {
      container.innerHTML = '<p class="leise">Heute kein Unterricht.</p>';
      return;
    }
    // Der Schultag als Linie: vergangene Stunden grau, die laufende markiert
    const jetzt = new Date();
    const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
    const inMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0); };
    container.innerHTML = `<ol class="fahrplan">${heuteItems.map(stunde => {
      const a = inMin(stunde.start), e = inMin(stunde.ende) ?? (a != null ? a + 45 : null);
      const zustand = e != null && minuten >= e ? 'vorbei' : (a != null && minuten >= a ? 'jetzt' : '');
      return `
        <li class="fahrplan-halt ${zustand}">
          <div class="fahrplan-zeit">${UI.escapeHtml(stunde.start)}${stunde.ende ? `<small>${UI.escapeHtml(stunde.ende)}</small>` : ''}</div>
          <span class="fahrplan-punkt"></span>
          <div>
            <div class="fahrplan-fach">${UI.escapeHtml(stunde.fach)}${stunde.raum ? `<span class="raum">${UI.escapeHtml(stunde.raum)}</span>` : ''}${zustand === 'jetzt' ? '<span class="jetzt-marke">jetzt</span>' : ''}</div>
            ${stunde.lehrer || stunde.notiz ? `<div class="fahrplan-info">${[stunde.lehrer, stunde.notiz].filter(Boolean).map(w => UI.escapeHtml(w)).join(' · ')}</div>` : ''}
          </div>
        </li>`;
    }).join('')}</ol>`;
  },

  rendereAufgaben(items) {
    const container = document.getElementById('schul-aufgaben-inhalt');
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="leise">Alles erledigt.</p>';
      return;
    }
    
    let html = '';
    items.forEach(a => {
      const faellig = a.faellig ? `bis ${this.formatTime(a.faellig)}` : 'heute';
      html += `
        <div class="aufgabe-item ${a.erledigt ? 'erledigt' : ''}">
          <input type="checkbox" class="aufgabe-checkbox" aria-label="Erledigt" ${a.erledigt ? 'checked' : ''} onchange="SchulDashboardView._aufgabeToggeln(${a.id}, this.checked)">
          <div class="aufgabe-text" style="flex:1">
            <div style="font-weight:700;">${UI.escapeHtml(a.titel)}</div>
            ${a.notiz ? `<div class="leise" style="margin-top:2px;">${UI.escapeHtml(a.notiz)}</div>` : ''}
          </div>
          <div class="zeit-badge">${faellig}</div>
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
        <div class="schul-kachel-kopf"><h2 class="schul-widget-titel">${UI.escapeHtml(kachel.titel)}</h2></div>
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
          UI.erfolg('An deinen Agenten geschickt.');
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
      container.innerHTML = '<p class="leise">Noch keine Ereignisse.</p>';
      return;
    }
    
    let html = '';
    items.forEach(f => {
      const art = { email: 'E-Mail', notfall: 'Notfall', briefing: 'Briefing', hausaufgabe: 'Hausaufgabe', info: 'Info' }[f.typ] || 'Info';
      const zeit = UI.uhrzeit(f.zeitpunkt);
      html += `
        <div class="feed-item typ-${UI.escapeHtml(f.typ)}">
          <span class="feed-zeit">${zeit} · ${art}</span>
          <div class="feed-inhalt">${this.markdownSicherRendern(f.inhalt)}</div>
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
        <div style="display:flex; align-items:center; gap:16px;">
          <svg class="icon" style="width:44px;height:44px;color:var(--blau)" aria-hidden="true"><use href="/img/icons.svg#i-${({ clear_sky: 'sonne', dry: 'sonne', partly_cloudy: 'wolkig', cloudy: 'wolke', fog: 'nebel', drizzle: 'regen', rain: 'regen', showers: 'regen', thunderstorm: 'gewitter', snow: 'schnee', sleet: 'schnee', hail: 'schnee' })[zustand] || 'wolke'}"></use></svg>
          <div class="zahl" style="font-size:44px; line-height:1;">${temperatur}°</div>
          <div>
            <div style="font-weight:700;">${UI.escapeHtml(daten.ort)}</div>
            <div class="leise">${symbole[zustand] || zustand.replace('_', ' ')}</div>
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
        html += `<h3 style="font-size:16px; margin:10px 0 2px; display:flex; gap:6px; align-items:center;">${UI.icon('ort')}${UI.escapeHtml(station.haltestelle)}</h3>`;
        
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
            : (ab.echtZeit ? `<span class="abfahrt-puenktlich">pünktlich</span>` : '');
            
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
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:var(--flaeche-2); margin-bottom:5px; border-radius:4px;">
        <span>${UI.escapeHtml(h.name)}</span>
        <button class="btn btn-ghost btn-klein btn-icon btn-haltestelle-loeschen" data-id="${h.id}" aria-label="Haltestelle entfernen">${UI.icon('loeschen')}</button>
      </div>
    `).join('') || '<div style="color:var(--text-sekundaer); margin-bottom:10px;">Keine Haltestellen gespeichert.</div>';

    UI.modalZeigen(`
      ${UI.modalKopf('Haltestellen verwalten')}
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
      ${UI.modalKopf(titel)}
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
