// yRelay - Admin-View
const AdminView = {
  aktiverTab: 'uebersicht',

  rendern(nutzer) {
    const avatarBuchstabe = (nutzer.benutzername || 'A')[0].toUpperCase();

    return `
      <div class="seite haupt-seite">
        <!-- Navigation -->
        <nav class="navbar">
          <span class="navbar-logo">
            <span class="logo-y">y</span><span class="logo-relay">Relay</span>
            <span style="font-size: 12px; color: var(--farbe-warnung); margin-left: 8px; font-weight: 600;">ADMIN</span>
          </span>
          <div class="navbar-nav">
            <div class="nav-nutzer">
              <div class="nav-avatar" style="background: var(--verlauf-warnung);">${UI.escapeHtml(avatarBuchstabe)}</div>
              <div class="nav-info">
                <span class="nav-name">${UI.escapeHtml(nutzer.benutzername)}</span>
                <span class="nav-rolle">Administrator</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-klein" id="nutzer-panel-btn" title="Benutzerpanel">👤 Benutzer</button>
            <button class="btn btn-ghost btn-klein" id="admin-abmelden-btn">Abmelden</button>
          </div>
        </nav>

        <!-- Hauptinhalt -->
        <main class="hauptinhalt">
          <div class="sektion-titel">⚙️ Admin-Panel</div>

          <!-- Tabs -->
          <div class="admin-tabs" role="tablist">
            <button class="admin-tab aktiv" data-tab="uebersicht" role="tab">📊 <span class="tab-text">Übersicht</span></button>
            <button class="admin-tab" data-tab="nutzer" role="tab">👥 <span class="tab-text">Nutzer</span></button>
            <button class="admin-tab" data-tab="nachrichten" role="tab">📨 <span class="tab-text">Nachrichten</span></button>
            <button class="admin-tab" data-tab="labels" role="tab">🏷️ <span class="tab-text">Labels</span></button>
            <button class="admin-tab" data-tab="audit" role="tab">📜 <span class="tab-text">Audit Log</span></button>
            <button class="admin-tab" data-tab="einstellungen" role="tab">🔧 <span class="tab-text">Einstellungen</span></button>
            <button class="admin-tab" data-tab="poke-profile" role="tab">🤖 <span class="tab-text">Poke-Profile</span></button>
          </div>

          <!-- Tab-Inhalt -->
          <div id="admin-tab-inhalt">
            <div class="lade-spinner" style="margin: 40px auto;"></div>
          </div>
        </main>
      </div>
    `;
  },

  async initialisieren(nutzer) {
    document.getElementById('admin-abmelden-btn')?.addEventListener('click', () => App.abmelden());

    document.getElementById('nutzer-panel-btn')?.addEventListener('click', () => {
      window.location.hash = '#dashboard';
    });

    // Tab-Navigation
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('aktiv'));
        tab.classList.add('aktiv');
        this.aktiverTab = tab.dataset.tab;
        await this.tabLaden(tab.dataset.tab);
      });
    });

    // Ersten Tab laden
    await this.tabLaden('uebersicht');
  },

  async tabLaden(tab) {
    const container = document.getElementById('admin-tab-inhalt');
    if (!container) return;

    container.innerHTML = '<div class="lade-spinner" style="margin: 40px auto;"></div>';

    try {
      switch (tab) {
              case 'uebersicht': await this.uebersichtRendern(container); break;
        case 'nutzer': await this.nutzerRendern(container); break;
        case 'nachrichten': await this.nachrichtenRendern(container); break;
        case 'labels': await this.labelsRendern(container); break;
        case 'einstellungen': await this.einstellungenRendern(container); break;
        case 'audit': await this.auditLogsLaden(container); break;
        case 'poke-profile': await this.pokeProfileRendern(container); break;
      }
    } catch (err) {
      container.innerHTML = `<div class="info-box fehler"><span>⚠️</span><span>Fehler: ${UI.escapeHtml(err.message)}</span></div>`;
    }
  },

  // ─── Übersicht ──────────────────────────────────────────────────────────

  async uebersichtRendern(container) {
    const stats = await API.adminStatistiken();
    const notiz = await API.adminNotizLaden();
    const labels = await API.adminLabelsLaden();

    container.innerHTML = `
      <div class="statistik-grid">
        <div class="statistik-kachel">
          <div class="statistik-wert">${stats.gesamtNutzer}</div>
          <div class="statistik-label">Registrierte Nutzer</div>
        </div>
        <div class="statistik-kachel">
          <div class="statistik-wert">${stats.aktiveNutzer}</div>
          <div class="statistik-label">Aktive Nutzer</div>
        </div>
        <div class="statistik-kachel">
          <div class="statistik-wert">${stats.gesamtNachrichten}</div>
          <div class="statistik-label">Nachrichten gesamt</div>
        </div>
        <div class="statistik-kachel">
          <div class="statistik-wert">${stats.heuteNachrichten}</div>
          <div class="statistik-label">Nachrichten heute</div>
        </div>
      </div>

      <div class="karte">
        <div class="karte-header">
          <div class="karte-icon karte-icon-info">🔗</div>
          <div>
            <div class="karte-titel">Poke-Webhook-Status</div>
            <div class="karte-untertitel">Verbindung zu Poke</div>
          </div>
        </div>
        <div class="karte-koerper">
          ${stats.webhookKonfiguriert
            ? '<div class="info-box erfolg"><span>✅</span><span>Poke-Webhook ist konfiguriert und aktiv.</span></div>'
            : '<div class="info-box warnung"><span>⚠️</span><span>Poke-Webhook ist noch nicht konfiguriert. Gehe zu den <strong>Einstellungen</strong> und trage die Webhook-Daten ein.</span></div>'
          }
        </div>
      </div>

      <div class="karte" style="margin-top: 20px;">
        <div class="karte-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-primaer">📝</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Admin-Notiz</div>
            <div class="karte-untertitel">Ein persönliches Notizfeld für dich</div>
          </div>
          <div>
            <button class="btn btn-sekundaer btn-klein" id="admin-notiz-speichern">Speichern</button>
          </div>
        </div>
        <div class="karte-koerper">
          <div class="textarea-wrapper">
            <textarea id="admin-notiz-feld" class="formular-textarea" rows="6" placeholder="Hier kannst du eine Notiz hinterlegen...">${UI.escapeHtml(notiz.text)}</textarea>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="karte" style="margin-top: 20px;">
        <div class="karte-header">
          <div class="karte-icon karte-icon-primaer">📈</div>
          <div><div class="karte-titel">Nachrichten (30 Tage)</div></div>
        </div>
        <div class="karte-koerper">
          <canvas id="chart-verlauf" height="100"></canvas>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        <div class="karte">
          <div class="karte-header">
            <div class="karte-icon karte-icon-erfolg">🎯</div>
            <div><div class="karte-titel">Antwortrate</div></div>
          </div>
          <div class="karte-koerper" style="display: flex; justify-content: center;">
            <div style="max-width: 200px;"><canvas id="chart-antwortrate"></canvas></div>
          </div>
        </div>
        <div class="karte">
          <div class="karte-header">
            <div class="karte-icon karte-icon-primaer">🏆</div>
            <div><div class="karte-titel">Top Nutzer</div></div>
          </div>
          <div class="karte-koerper">
            <canvas id="chart-top-nutzer" height="140"></canvas>
          </div>
        </div>
      </div>

      <!-- Broadcast-Karte -->
      <div class="karte" style="margin-top: 20px;">
        <div class="karte-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-warnung">📢</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Broadcast-Mail</div>
            <div class="karte-untertitel">E-Mail an alle aktiven Nutzer senden</div>
          </div>
        </div>
        <div class="karte-koerper">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="formular-gruppe">
              <label class="formular-label" for="broadcast-betreff">Betreff</label>
              <input class="formular-eingabe" type="text" id="broadcast-betreff" placeholder="Wichtige Mitteilung">
            </div>
            <div class="formular-gruppe">
              <label class="formular-label" for="broadcast-label">Empfänger-Label (optional)</label>
              <select class="formular-select" id="broadcast-label">
                <option value="">Alle aktiven Nutzer</option>
                ${labels.map(l => `<option value="${l.id}">${UI.escapeHtml(l.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="broadcast-nachricht">Nachricht</label>
            <textarea class="formular-textarea" id="broadcast-nachricht" rows="4" placeholder="Deine Nachricht an alle Nutzer..."></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-warnung btn-klein" id="broadcast-senden-btn">📢 An alle senden</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-notiz-speichern')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const text = document.getElementById('admin-notiz-feld').value;
      UI.btnLaden(btn, true);
      try {
        await API.adminNotizSpeichern(text);
        UI.erfolg('Notiz erfolgreich gespeichert.');
      } catch (err) {
        UI.fehler('Fehler beim Speichern der Notiz: ' + err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Chart.js laden und Charts rendern
    if (!window.Chart) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      document.head.appendChild(s);
      await new Promise(r => s.onload = r);
    }
    this._renderCharts(stats);

    // Broadcast-Karte Event
    document.getElementById('broadcast-senden-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const betreff = document.getElementById('broadcast-betreff').value.trim();
      const nachricht = document.getElementById('broadcast-nachricht').value.trim();
      const labelId = document.getElementById('broadcast-label').value;
      
      if (!betreff || !nachricht) { UI.fehler('Betreff und Nachricht bitte ausfüllen.'); return; }
      if (!confirm(`Broadcast wirklich senden?`)) return;
      UI.btnLaden(btn, true);
      try {
        const result = await API.adminBroadcastSenden(betreff, nachricht, labelId || null);
        UI.erfolg(result.nachricht);
        document.getElementById('broadcast-betreff').value = '';
        document.getElementById('broadcast-nachricht').value = '';
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },

  _renderCharts(stats) {
    // Nachrichten-Verlauf Chart
    const verlaufCtx = document.getElementById('chart-verlauf')?.getContext('2d');
    if (verlaufCtx && stats.nachrichtenProTag?.length > 0) {
      new Chart(verlaufCtx, {
        type: 'line',
        data: {
          labels: stats.nachrichtenProTag.map(d => {
            const [y, m, day] = d.tag.split('-');
            return `${day}.${m}.`;
          }),
          datasets: [{ label: 'Nachrichten', data: stats.nachrichtenProTag.map(d => d.anzahl), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0 } } }
      });
    }

    // Antwortrate Donut
    const antwortrateCtx = document.getElementById('chart-antwortrate')?.getContext('2d');
    if (antwortrateCtx) {
      new Chart(antwortrateCtx, {
        type: 'doughnut',
        data: {
          labels: ['Beantwortet', 'Offen'],
          datasets: [{ data: [stats.antwortrate?.beantwortet || 0, stats.antwortrate?.offen || 0], backgroundColor: ['#10b981', '#1e293b'], borderColor: ['#059669', '#334155'], borderWidth: 2 }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, cutout: '65%' }
      });
    }

    // Top Nutzer Bar Chart
    const topNutzerCtx = document.getElementById('chart-top-nutzer')?.getContext('2d');
    if (topNutzerCtx && stats.topNutzer?.length > 0) {
      new Chart(topNutzerCtx, {
        type: 'bar',
        data: {
          labels: stats.topNutzer.map(n => n.username),
          datasets: [{ label: 'Nachrichten', data: stats.topNutzer.map(n => n.anzahl), backgroundColor: 'rgba(99,102,241,0.6)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0 } } }
      });
    }
  },

  // ─── Labels-Verwaltung ──────────────────────────────────────────────────

  async labelsRendern(container) {
    const labels = await API.adminLabelsLaden();
    const farbOptionen = [
      { hex: '#6366f1', name: 'Indigo' }, { hex: '#8b5cf6', name: 'Violett' },
      { hex: '#10b981', name: 'Grün' }, { hex: '#f59e0b', name: 'Gelb' },
      { hex: '#ef4444', name: 'Rot' }, { hex: '#06b6d4', name: 'Cyan' },
      { hex: '#ec4899', name: 'Pink' }, { hex: '#64748b', name: 'Grau' },
    ];

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-primaer">🏷️</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Labels verwalten</div>
            <div class="karte-untertitel">${labels.length} Labels erstellt</div>
          </div>
        </div>
        <div class="karte-koerper">
          <!-- Neues Label -->
          <div style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap;">
            <div class="formular-gruppe" style="flex: 1; min-width: 200px; margin: 0;">
              <label class="formular-label">Label-Name</label>
              <input class="formular-eingabe" type="text" id="label-name" placeholder="z.B. Familie, Freunde, Arbeit">
            </div>
            <div class="formular-gruppe" style="margin: 0;">
              <label class="formular-label">Farbe</label>
              <select class="formular-select" id="label-farbe" style="width: 140px;">
                ${farbOptionen.map(f => `<option value="${f.hex}">${f.name}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primaer btn-klein" id="label-erstellen-btn">+ Erstellen</button>
          </div>

          <!-- Label-Liste -->
          <div id="label-liste">
            ${labels.length === 0 ? UI.leereListeHtml('🏷️', 'Noch keine Labels erstellt.') : `
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${labels.map(l => `
                  <div style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: ${l.farbe}; display: inline-block;"></span>
                    <span style="font-size: 13px; font-weight: 600; color: var(--farbe-text);">${UI.escapeHtml(l.name)}</span>
                    <span style="font-size: 11px; color: var(--farbe-text-gedaempft);">(${l.nutzerAnzahl})</span>
                    <button onclick="AdminView._labelLoeschen(${l.id})" style="background: none; border: none; color: var(--farbe-text-schwach); cursor: pointer; font-size: 14px;" title="Label löschen">×</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    document.getElementById('label-erstellen-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const name = document.getElementById('label-name').value.trim();
      const farbe = document.getElementById('label-farbe').value;
      if (!name) { UI.fehler('Bitte einen Label-Namen eingeben.'); return; }
      UI.btnLaden(btn, true);
      try {
        await API.adminLabelErstellen(name, farbe);
        UI.erfolg(`Label "${name}" erstellt.`);
        await this.labelsRendern(container);
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },

  async _labelLoeschen(id) {
    if (!confirm('Label wirklich löschen? Es wird von allen Nutzern entfernt.')) return;
    try {
      await API.adminLabelLoeschen(id);
      UI.erfolg('Label gelöscht.');
      await this.tabLaden('labels');
    } catch (err) {
      UI.fehler(err.message);
    }
  },


  async nutzerRendern(container) {
    const nutzer = await API.adminNutzerLaden();
    this.nutzerListe = nutzer;
    let labels = [];
    try { labels = await API.adminLabelsLaden(); } catch(e) {}

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header" style="padding-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-primaer">👥</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Nutzer-Verwaltung</div>
            <div class="karte-untertitel">${nutzer.length} Nutzer insgesamt</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <select id="nutzer-label-filter" class="formular-select" style="min-width: 150px; padding: 4px 8px; font-size: 13px;">
              <option value="all">Alle Labels</option>
              ${labels.map(l => `<option value="${l.id}">${UI.escapeHtml(l.name)}</option>`).join('')}
            </select>
            <button class="btn btn-sekundaer btn-klein" id="nutzer-einladen-btn">✉️ Einladen</button>
            <button class="btn btn-primaer btn-klein" id="nutzer-erstellen-btn">+ Erstellen</button>
          </div>
        </div>
        <div class="karte-koerper" style="padding-top: 0;">
          ${nutzer.length === 0
            ? UI.leereListeHtml('👤', 'Noch keine Nutzer. Erstelle den ersten Nutzer!')
            : `
              <div class="tabelle-container">
                <table class="tabelle">
                  <thead>
                    <tr>
                      <th>Nutzer</th>
                      <th>E-Mail</th>
                      <th>Status</th>
                      <th class="col-letzter-login">Letzter Login</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${nutzer.map(n => `
                      <tr class="nutzer-zeile" data-label-ids="${n.labelIds.join(',')}">
                        <td>
                          <strong>${UI.escapeHtml(n.anzeigename || n.benutzername)}</strong>
                          ${n.anzeigename ? `<span style="font-size: 12px; color: var(--farbe-text-gedaempft); margin-left: 6px;">@${UI.escapeHtml(n.benutzername)}</span>` : ''}
                          ${n.rolle === 'admin' ? '<span style="font-size: 11px; color: var(--farbe-warnung); margin-left: 6px;">Admin</span>' : ''}
                        </td>
                        <td style="color: var(--farbe-text-gedaempft);">${UI.escapeHtml(n.email)}</td>
                        <td>
                          ${n.hatEinladungAusstehend
                            ? '<span class="status-badge ausstehend">Einladung ausstehend</span>'
                            : n.aktiv
                              ? '<span class="status-badge aktiv">Aktiv</span>'
                              : '<span class="status-badge inaktiv">Inaktiv</span>'
                          }
                        </td>
                        <td class="col-letzter-login" style="color: var(--farbe-text-schwach); font-size: 13px;">${UI.datumFormatieren(n.letzterLogin)}</td>
                        <td>
                          <div class="tabellen-aktionen">
                            ${n.rolle !== 'admin' ? `
                              <button class="btn btn-ghost btn-klein"
                                onclick="AdminView.nutzerStatusToggle(${n.id}, ${!n.aktiv})"
                                title="${n.aktiv ? 'Deaktivieren' : 'Aktivieren'}">
                                ${n.aktiv ? '⏸' : '▶️'}
                              </button>
                              ${n.hatEinladungAusstehend ? `
                                <button class="btn btn-sekundaer btn-klein"
                                  onclick="AdminView.einladungNeu(${n.id})"
                                  title="Neue Einladung senden">
                                  ↩️
                                </button>
                              ` : ''}
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.nutzerBearbeitenModal(${n.id})"
                                title="Nutzer bearbeiten">
                                ✏️
                              </button>
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.nutzerLabelsBearbeiten(${n.id}, '${UI.escapeHtml(n.benutzername)}')"
                                title="Labels zuweisen">
                                🏷️
                              </button>
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.nutzerPokeProfileBearbeiten(${n.id})"
                                title="Poke-Profile zuweisen">
                                🤖
                              </button>
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.passwortReset(${n.id}, '${UI.escapeHtml(n.benutzername)}')"
                                title="Passwort zurücksetzen (E-Mail senden)">
                                🔑
                              </button>
                              <button class="btn btn-gefahr btn-klein"
                                onclick="AdminView.nutzerLoeschen(${n.id}, '${UI.escapeHtml(n.benutzername)}')"
                                title="Nutzer löschen">
                                🗑️
                              </button>
                            ` : `
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.nutzerBearbeitenModal(${n.id})"
                                title="Profil bearbeiten">
                                ✏️
                              </button>
                              <button class="btn btn-sekundaer btn-klein"
                                onclick="AdminView.passwortReset(${n.id}, '${UI.escapeHtml(n.benutzername)}')"
                                title="Eigenes Passwort zurücksetzen">
                                🔑
                              </button>
                            `}
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `
          }
        </div>
      </div>
    `;

    document.getElementById('nutzer-label-filter')?.addEventListener('change', (e) => {
      const selected = e.target.value;
      document.querySelectorAll('.nutzer-zeile').forEach(row => {
        if (selected === 'all') {
          row.style.display = '';
        } else {
          const ids = row.dataset.labelIds.split(',').filter(Boolean);
          row.style.display = ids.includes(selected) ? '' : 'none';
        }
      });
    });

    document.getElementById('nutzer-erstellen-btn')?.addEventListener('click', () => {
      this.nutzerErstellenModal();
    });

    document.getElementById('nutzer-einladen-btn')?.addEventListener('click', () => {
      this.nutzerEinladenModal();
    });
  },

  async nutzerStatusToggle(id, aktivieren) {
    try {
      await API.adminNutzerStatus(id, aktivieren);
      UI.erfolg(`Nutzer erfolgreich ${aktivieren ? 'aktiviert' : 'deaktiviert'}.`);
      await this.tabLaden('nutzer');
    } catch (err) {
      UI.fehler(err.message);
    }
  },

  async nutzerPokeProfileBearbeiten(nutzerId) {
    const n = this.nutzerListe.find(u => u.id === nutzerId);
    if (!n) return;
    const name = n.benutzername;

    try {
      const [alleProfile, nutzer] = await Promise.all([
        API.adminPokeProfileLaden(),
        API.anfrage('GET', `/admin/nutzer/${nutzerId}`)
      ]);

      const nutzerProfileIds = (nutzer.poke_profile || []).map(p => p.id);

      let html = `<form id="profil-zuweisen-form" style="display:flex; flex-direction:column; gap:15px;">
        <p>Wähle aus, welche Poke-Profile <strong>${UI.escapeHtml(name)}</strong> nutzen darf:</p>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto; padding-right:10px;">
      `;

      if (alleProfile.length === 0) {
        html += `<p>Es wurden noch keine Poke-Profile angelegt.</p>`;
      } else {
        alleProfile.forEach(p => {
          const checked = nutzerProfileIds.includes(p.id) ? 'checked' : '';
          html += `
            <label style="display:flex; align-items:center; gap:10px; padding:8px; background:var(--hintergrund-karte); border-radius:var(--radius-mittel); cursor:pointer;">
              <input type="checkbox" name="profil_id" value="${p.id}" ${checked}>
              <span>${UI.escapeHtml(p.icon)} ${UI.escapeHtml(p.name)}</span>
              ${p.ist_standard ? '<span class="status-badge" style="background:#3b82f6; margin-left:auto;">Standard</span>' : ''}
            </label>
          `;
        });
      }

      html += `
        </div>
        <button type="submit" class="btn btn-primaer" style="margin-top:10px;">💾 Speichern</button>
      </form>`;

      UI.modalZeigen(`
        <div class="modal-header">
          <span class="modal-titel">🤖 Poke-Profile für ${UI.escapeHtml(name)}</span>
          <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
        </div>
        <div class="modal-koerper">
          ${html}
        </div>
      `);

      document.getElementById('profil-zuweisen-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        UI.btnLaden(btn, true);

        const ausgewaehlte = Array.from(e.target.querySelectorAll('input[name="profil_id"]:checked')).map(cb => parseInt(cb.value));
        
        try {
          await API.adminPokeProfileZuweisen(nutzerId, ausgewaehlte);
          UI.erfolg('Poke-Profile erfolgreich zugewiesen.');
          UI.schliesseModal();
          await this.tabLaden('nutzer');
        } catch (err) {
          UI.fehler(err.message);
          UI.btnLaden(btn, false);
        }
      });
    } catch (err) {
      UI.fehler('Fehler beim Laden der Profile: ' + err.message);
    }
  },

  async nutzerLabelsBearbeiten(nutzerId, name) {
    try {
      const allLabels = await API.adminLabelsLaden();
      const nutzerLabels = await API.adminNutzerLabelsLaden(nutzerId);
      const nutzerLabelIds = nutzerLabels.map(l => l.id);

      UI.modalZeigen(`
        <div class="modal-header">
          <span class="modal-titel">🏷️ Labels für ${UI.escapeHtml(name)}</span>
          <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
        </div>
        <div class="modal-koerper">
          <form id="nutzer-labels-formular">
            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
              ${allLabels.length === 0 ? '<p>Noch keine Labels erstellt.</p>' : allLabels.map(l => `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                  <input type="checkbox" name="nutzer-label-checkbox" value="${l.id}" id="label-${l.id}" ${nutzerLabelIds.includes(l.id) ? 'checked' : ''} style="width: 18px; height: 18px;">
                  <label for="label-${l.id}" style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
                    <span style="width: 12px; height: 12px; border-radius: 50%; background: ${l.farbe}; display: inline-block;"></span>
                    <span>${UI.escapeHtml(l.name)}</span>
                  </label>
                </div>
              `).join('')}
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
              <button type="submit" class="btn btn-primaer" style="flex: 1;" id="nutzer-labels-speichern">Speichern</button>
            </div>
          </form>
        </div>
      `);

      document.getElementById('nutzer-labels-formular')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('nutzer-labels-speichern');
        const checkboxes = document.querySelectorAll('input[name="nutzer-label-checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
        
        UI.btnLaden(btn, true);
        try {
          await API.adminNutzerLabelsSetzen(nutzerId, selectedIds);
          UI.modalSchliessen();
          UI.erfolg('Labels erfolgreich zugewiesen.');
          await this.tabLaden('nutzer');
        } catch (err) {
          UI.fehler(err.message);
          UI.btnLaden(btn, false);
        }
      });
    } catch (err) {
      UI.fehler('Fehler beim Laden der Labels: ' + err.message);
    }
  },

  async nutzerLoeschen(id, name) {
    if (!confirm(`Möchtest du den Nutzer "${name}" wirklich unwiderruflich löschen?`)) return;
    try {
      await API.adminNutzerLoeschen(id);
      UI.erfolg(`Nutzer "${name}" wurde gelöscht.`);
      await this.tabLaden('nutzer');
    } catch (err) {
      UI.fehler(err.message);
    }
  },

  async passwortReset(id, name) {
    if (!confirm(`Möchtest du wirklich eine E-Mail zum Zurücksetzen des Passworts an "${name}" senden?`)) return;
    try {
      const antwort = await API.adminNutzerPasswortReset(id);
      UI.erfolg(antwort.nachricht);
    } catch (err) {
      UI.fehler(err.message);
    }
  },

  async einladungNeu(id) {
    try {
      const ergebnis = await API.adminEinladungNeu(id);
      if (ergebnis.einladungsToken) {
        // Einladungslink anzeigen falls E-Mail fehlschlug
        const appUrl = window.location.origin;
        UI.modalZeigen(`
          <div class="modal-header">
            <span class="modal-titel">Einladungslink</span>
            <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
          </div>
          <div class="modal-koerper">
            <div class="info-box warnung" style="margin-bottom: 16px;">
              <span>⚠️</span>
              <span>E-Mail konnte nicht gesendet werden. Teile diesen Link manuell:</span>
            </div>
            <div class="formular-gruppe">
              <input class="formular-eingabe" type="text" value="${appUrl}/#einladung/${ergebnis.einladungsToken}" readonly onclick="this.select()">
            </div>
            <button class="btn btn-primaer btn-vollbreite" onclick="navigator.clipboard.writeText('${appUrl}/#einladung/${ergebnis.einladungsToken}'); UI.erfolg('Link kopiert!'); UI.modalSchliessen();">
              📋 Link kopieren
            </button>
          </div>
        `);
        // Nutzerliste im Hintergrund aktualisieren (ohne das Modal zu schließen)
        await this.tabLaden('nutzer');
      } else if (ergebnis.inviteUrl) {
        const url = ergebnis.inviteUrl;
        UI.modalZeigen(`
          <div class="modal-header">
            <span class="modal-titel">Einladungslink</span>
            <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
          </div>
          <div class="modal-koerper">
            <div class="info-box info" style="margin-bottom: 16px;">
              <span>ℹ️</span>
              <span>${ergebnis.nachricht} Teile diesen Link manuell mit dem Nutzer:</span>
            </div>
            <div class="formular-gruppe">
              <input class="formular-eingabe" type="text" value="${url}" readonly onclick="this.select()">
            </div>
            <button class="btn btn-primaer btn-vollbreite" onclick="navigator.clipboard.writeText('${url}'); UI.erfolg('Link kopiert!'); UI.modalSchliessen();">
              📋 Link kopieren
            </button>
          </div>
        `);
        await this.tabLaden('nutzer');
      } else {
        UI.erfolg('Neue Einladung gesendet.');
        await this.tabLaden('nutzer');
      }
    } catch (err) {
      UI.fehler(err.message);
    }
  },

  async nutzerBearbeitenModal(id) {
    const nutzer = AdminView.nutzerListe.find(n => n.id === id);
    if (!nutzer) return;
    const benutzername = nutzer.benutzername;
    const email = nutzer.email;
    const anzeigename = nutzer.anzeigename;
    const ntfy_topic = nutzer.ntfy_topic;
    const email_notifications = nutzer.email_notifications;
    const has_schul_access = nutzer.has_schul_access;
    const schul_poke_profile_id = nutzer.schul_poke_profile_id;


    let profile = [];
    try {
      profile = await API.adminPokeProfileLaden();
    } catch(e) {}

    const profileOptions = profile.map(p => `<option value="${p.id}" ${schul_poke_profile_id == p.id ? 'selected' : ''}>${UI.escapeHtml(p.name)}</option>`).join('');

    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">✏️ Nutzer bearbeiten</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        <form id="bearbeiten-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="bearbeiten-benutzername">Benutzername</label>
            <input class="formular-eingabe" type="text" id="bearbeiten-benutzername" required value="${benutzername}">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="bearbeiten-anzeigename">Anzeigename (optional)</label>
            <input class="formular-eingabe" type="text" id="bearbeiten-anzeigename" value="${anzeigename}">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="bearbeiten-email">E-Mail (optional)</label>
            <input class="formular-eingabe" type="email" id="bearbeiten-email" value="${email}">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="bearbeiten-ntfy">ntfy.sh Topic (optional)</label>
            <div style="display: flex; gap: 8px;">
              <input class="formular-eingabe" type="text" id="bearbeiten-ntfy" value="${ntfy_topic}" placeholder="z.B. yrelay-ruwen-abc123xyz" maxlength="32" pattern="[A-Za-z0-9_-]+" style="flex: 1;">
              <button type="button" class="btn btn-ghost" id="admin-ntfy-generieren" title="Zufälliges Topic generieren">🎲 Generieren</button>
            </div>
          </div>
          <div class="formular-gruppe" style="margin-top: 15px;">
            <label class="formular-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="bearbeiten-email-notifications" ${email_notifications ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
              ✉️ E-Mail-Benachrichtigungen senden
            </label>
          </div>
          <div class="formular-gruppe" style="margin-top: 5px;">
            <label class="formular-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="bearbeiten-schul-access" ${has_schul_access ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
              🎒 Zugriff auf Schul-Dashboard erlauben
            </label>
          </div>
          <div class="formular-gruppe" id="schul-poke-auswahl-container" style="${has_schul_access ? '' : 'display:none;'}">
            <label class="formular-label" for="bearbeiten-schul-poke">Poke für Schul-Dashboard (optional)</label>
            <select class="formular-select" id="bearbeiten-schul-poke">
              <option value="">-- Standard Poke --</option>
              ${profileOptions}
            </select>
          </div>
          <div id="bearbeiten-fehler" class="info-box fehler versteckt" style="margin-bottom: 12px;">
            <span>⚠️</span><span id="bearbeiten-fehler-text"></span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" style="flex: 1;" id="bearbeiten-submit-btn">Speichern</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('admin-ntfy-generieren')?.addEventListener('click', () => {
      const generateSafeString = () => {
        if (window.crypto && window.crypto.randomUUID) {
          return window.crypto.randomUUID().replace(/-/g, '');
        }
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };
      const uname = document.getElementById('bearbeiten-benutzername').value.trim() || 'nutzer';
      const name = uname.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'nutzer';
      const topic = `yrelay-${name}-${generateSafeString().slice(0, 14)}`;
      document.getElementById('bearbeiten-ntfy').value = topic;
    });

    document.getElementById('bearbeiten-schul-access')?.addEventListener('change', (e) => {
      document.getElementById('schul-poke-auswahl-container').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('bearbeiten-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('bearbeiten-submit-btn');
      const fehlerBox = document.getElementById('bearbeiten-fehler');
      const fehlerText = document.getElementById('bearbeiten-fehler-text');
      
      const uname = document.getElementById('bearbeiten-benutzername').value.trim();
      const emailVal = document.getElementById('bearbeiten-email').value.trim();
      const anzeigename = document.getElementById('bearbeiten-anzeigename').value.trim();
      const ntfy = document.getElementById('bearbeiten-ntfy').value.trim();
      const emailNotif = document.getElementById('bearbeiten-email-notifications').checked;
      const schulAccess = document.getElementById('bearbeiten-schul-access').checked;
      const schulPokeId = document.getElementById('bearbeiten-schul-poke').value || null;

      fehlerBox.classList.add('versteckt');
      UI.btnLaden(btn, true);

      try {
        await API.adminNutzerBearbeiten(id, uname, emailVal, anzeigename, ntfy, emailNotif, schulAccess, schulPokeId);
        UI.modalSchliessen();
        UI.erfolg('Nutzerdaten erfolgreich aktualisiert.');
        await this.tabLaden('nutzer');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
        UI.btnLaden(btn, false);
      }
    });
  },

  nutzerErstellenModal() {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">➕ Nutzer erstellen</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        <form id="erstellen-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="erstellen-benutzername">Benutzername</label>
            <input class="formular-eingabe" type="text" id="erstellen-benutzername" required autocomplete="off">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="erstellen-anzeigename">Anzeigename (optional)</label>
            <input class="formular-eingabe" type="text" id="erstellen-anzeigename" autocomplete="off" placeholder="z.B. Max Mustermann">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="erstellen-email">E-Mail (optional)</label>
            <input class="formular-eingabe" type="email" id="erstellen-email" autocomplete="off">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="erstellen-passwort">Passwort</label>
            <input class="formular-eingabe" type="password" id="erstellen-passwort" required minlength="8" placeholder="Mindestens 8 Zeichen">
          </div>
          <div id="erstellen-fehler" class="info-box fehler versteckt" style="margin-bottom: 12px;">
            <span>⚠️</span><span id="erstellen-fehler-text"></span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" style="flex: 1;" id="erstellen-submit-btn">Nutzer erstellen</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('erstellen-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('erstellen-submit-btn');
      const fehlerBox = document.getElementById('erstellen-fehler');
      const fehlerText = document.getElementById('erstellen-fehler-text');
      fehlerBox.classList.add('versteckt');

      UI.btnLaden(btn, true);
      try {
        await API.adminNutzerErstellen(
          document.getElementById('erstellen-benutzername').value.trim(),
          document.getElementById('erstellen-email').value.trim(),
          document.getElementById('erstellen-passwort').value,
          document.getElementById('erstellen-anzeigename').value.trim()
        );
        UI.modalSchliessen();
        UI.erfolg('Nutzer erfolgreich erstellt.');
        await this.tabLaden('nutzer');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
        UI.btnLaden(btn, false);
      }
    });
  },

  nutzerEinladenModal() {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">✉️ Nutzer einladen</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        <div class="info-box info" style="margin-bottom: 20px;">
          <span>ℹ️</span>
          <span>Der Nutzer erhält eine E-Mail mit einem Aktivierungslink. Falls SMTP nicht konfiguriert ist, wird der Link manuell angezeigt.</span>
        </div>
        <form id="einladen-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="einladen-benutzername">Benutzername</label>
            <input class="formular-eingabe" type="text" id="einladen-benutzername" required autocomplete="off">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="einladen-anzeigename">Anzeigename (optional)</label>
            <input class="formular-eingabe" type="text" id="einladen-anzeigename" autocomplete="off" placeholder="z.B. Max Mustermann">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="einladen-email">E-Mail-Adresse (optional)</label>
            <input class="formular-eingabe" type="email" id="einladen-email" autocomplete="off">
          </div>
          <div id="einladen-fehler" class="info-box fehler versteckt" style="margin-bottom: 12px;">
            <span>⚠️</span><span id="einladen-fehler-text"></span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" style="flex: 1;" id="einladen-submit-btn">Einladung senden</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('einladen-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('einladen-submit-btn');
      const fehlerBox = document.getElementById('einladen-fehler');
      const fehlerText = document.getElementById('einladen-fehler-text');
      fehlerBox.classList.add('versteckt');

      UI.btnLaden(btn, true);
      try {
        const ergebnis = await API.adminNutzerEinladen(
          document.getElementById('einladen-benutzername').value.trim(),
          document.getElementById('einladen-email').value.trim(),
          document.getElementById('einladen-anzeigename').value.trim()
        );

        if (ergebnis.inviteUrl) {
          UI.modalSchliessen();
          const url = ergebnis.inviteUrl;
          UI.modalZeigen(`
            <div class="modal-header">
              <span class="modal-titel">Einladungslink</span>
              <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
            </div>
            <div class="modal-koerper">
              <div class="info-box info" style="margin-bottom: 16px;">
                <span>ℹ️</span>
                <span>${ergebnis.nachricht}</span>
              </div>
              <div class="formular-gruppe">
                <input class="formular-eingabe" type="text" value="${url}" readonly onclick="this.select()">
              </div>
              <button class="btn btn-primaer btn-vollbreite"
                onclick="navigator.clipboard.writeText('${url}'); UI.erfolg('Link kopiert!'); UI.modalSchliessen();">
                📋 Link kopieren
              </button>
            </div>
          `);
        } else {
          UI.modalSchliessen();
          UI.erfolg('Einladung erfolgreich versendet!');
        }
        await this.tabLaden('nutzer');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
        UI.btnLaden(btn, false);
      }
    });
  },

  // ─── Nachrichten-Übersicht ──────────────────────────────────────────────

  async nachrichtenRendern(container) {
    const nachrichten = await API.adminNachrichtenLaden();

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header" style="padding-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-info">📨</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Alle gesendeten Nachrichten</div>
            <div class="karte-untertitel">${nachrichten.length} Nachrichten</div>
          </div>
        </div>
        <div class="karte-koerper" style="padding-top: 0;">
          ${nachrichten.length === 0
            ? UI.leereListeHtml('📭', 'Noch keine Nachrichten gesendet.')
            : `
              <div class="verlauf-liste">
                ${nachrichten.map(n => `
                  <div class="verlauf-eintrag">
                    <div>
                      ${UI.typBadge(n.typ, n.prioritaet)}
                      ${n.prioritaet ? `<div style="margin-top: 4px; font-size: 11px; color: var(--farbe-text-schwach);">${UI.prioritaetText(n.prioritaet)}</div>` : ''}
                    </div>
                    <div>
                      <div class="verlauf-nutzer">👤 ${UI.escapeHtml(n.von.benutzername)} &lt;${UI.escapeHtml(n.von.email)}&gt;</div>
                      <div style="margin-top: 6px;">${UI.renderInhalt(n.inhalt)}</div>
                      ${n.fehler ? `<div style="font-size: 12px; color: var(--farbe-notfall); margin-top: 4px;">⚠️ ${UI.escapeHtml(n.fehler)}</div>` : ''}
                      ${UI.renderAntworten(n.id, n.antwortText, n.nutzerAntworten)}
                    </div>
                    <div style="text-align: right;">
                      <div class="verlauf-datum">${UI.datumFormatieren(n.gesendetAm)}</div>
                      <div class="verlauf-status ${n.status === 'gesendet' ? 'gesendet' : 'fehlgeschlagen'}" style="margin-top: 4px;">
                        ${n.status === 'gesendet' ? '✓ Gesendet' : '✗ Fehlgeschlagen'}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `
          }
        </div>
      </div>
    `;
  },

  // ─── Einstellungen ──────────────────────────────────────────────────────

  async einstellungenRendern(container) {
    const einstellungen = await API.adminEinstellungenLaden();
    let backups = [];
    try { backups = await API.adminBackupsLaden(); } catch(e) {}

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-primaer">🔗</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Poke-Webhook</div>
            <div class="karte-untertitel">Verbindung zu deinem Poke KI-Assistenten</div>
          </div>
        </div>
        <div class="karte-koerper">
          <form id="einstellungen-formular">
            <!-- Poke-Webhook -->
            <div class="einstellungen-sektion">
              <div class="einstellungen-sektion-titel">🤖 Poke API</div>
              <div class="formular-gruppe">
                <label class="formular-label" for="poke-url">Webhook-URL</label>
                <input class="formular-eingabe" type="url" id="poke-url" value="${UI.escapeHtml(einstellungen.pokeWebhookUrl)}" placeholder="https://poke.com/api/v1/inbound/api-message">
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="poke-key">API Key (V2)</label>
                <input class="formular-eingabe" type="password" id="poke-key" placeholder="${einstellungen.pokeApiKeyGesetzt ? '••••••••  (unveränderter gespeicherter Key)' : 'Bearer-Token eingeben'}">
              </div>
            </div>

            <hr class="trennlinie">

            <!-- SMTP -->
            <div class="einstellungen-sektion">
              <div class="einstellungen-sektion-titel">📧 SMTP (optional - für Einladungsmails)</div>
              <div class="einstellungen-grid">
                <div class="formular-gruppe">
                  <label class="formular-label" for="smtp-host">SMTP-Server</label>
                  <input class="formular-eingabe" type="text" id="smtp-host" value="${UI.escapeHtml(einstellungen.smtpHost)}" placeholder="smtp.example.com">
                </div>
                <div class="formular-gruppe">
                  <label class="formular-label" for="smtp-port">Port</label>
                  <input class="formular-eingabe" type="number" id="smtp-port" value="${UI.escapeHtml(einstellungen.smtpPort)}" placeholder="587">
                </div>
                <div class="formular-gruppe">
                  <label class="formular-label" for="smtp-user">Benutzername</label>
                  <input class="formular-eingabe" type="text" id="smtp-user" value="${UI.escapeHtml(einstellungen.smtpUser)}" placeholder="dein@email.de" autocomplete="off">
                </div>
                <div class="formular-gruppe">
                  <label class="formular-label" for="smtp-pass">Passwort</label>
                  <input class="formular-eingabe" type="password" id="smtp-pass" placeholder="${einstellungen.smtpPassGesetzt ? '••••••••  (unverändert)' : 'SMTP-Passwort'}">
                </div>
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="smtp-from">Absender-Adresse</label>
                <input class="formular-eingabe" type="email" id="smtp-from" value="${UI.escapeHtml(einstellungen.smtpFrom)}" placeholder="yrelay@example.com">
              </div>
              <button type="button" class="btn btn-sekundaer btn-klein" id="smtp-test-btn">🔌 SMTP-Verbindung testen</button>
            </div>

            <hr class="trennlinie">

            <!-- App-URL -->
            <div class="einstellungen-sektion">
              <div class="einstellungen-sektion-titel">🌐 App-Einstellungen</div>
              <div class="formular-gruppe">
                <label class="formular-label" for="app-url">Öffentliche App-URL</label>
                <input class="formular-eingabe" type="url" id="app-url" value="${UI.escapeHtml(einstellungen.appUrl)}" placeholder="https://yrelay.deinedomain.de">
                <p class="text-gedaempft" style="margin-top: 6px;">Wird für Einladungslinks in E-Mails verwendet.</p>
              </div>
            </div>

            <hr class="trennlinie">

            <!-- Schul-Dashboard -->
            <div class="einstellungen-sektion">
              <div class="einstellungen-sektion-titel">🎒 Schul-Dashboard (Modus)</div>
              <div class="formular-gruppe">
                <label class="formular-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="schul-dashboard-global" ${einstellungen.schulDashboardEnabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                  Das Schul-Dashboard-Feature global aktivieren
                </label>
                <p class="text-gedaempft" style="margin-top: 6px;">Wenn aktiv, können autorisierte Nutzer das Schul-Dashboard nutzen.</p>
              </div>
              <div class="einstellungen-grid">
                <div class="formular-gruppe">
                  <label class="formular-label" for="schul-startzeit">Schulbeginn</label>
                  <input class="formular-eingabe" type="time" id="schul-startzeit" value="${UI.escapeHtml(einstellungen.schulStartzeit)}">
                </div>
                <div class="formular-gruppe">
                  <label class="formular-label" for="schul-endzeit">Schulende</label>
                  <input class="formular-eingabe" type="time" id="schul-endzeit" value="${UI.escapeHtml(einstellungen.schulEndzeit)}">
                </div>
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="schul-wochentage">Schultage (0 Sonntag bis 6 Samstag, kommasepariert)</label>
                <input class="formular-eingabe" type="text" id="schul-wochentage" value="${UI.escapeHtml(einstellungen.schulWochentage)}" placeholder="1,2,3,4,5">
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="schul-zeitzone">Zeitzone</label>
                <input class="formular-eingabe" type="text" id="schul-zeitzone" value="${UI.escapeHtml(einstellungen.schulZeitzone)}" placeholder="Europe/Berlin">
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="schul-ferien">Ferienzeiträume (JSON, z. B. [{"von":"2026-10-12","bis":"2026-10-24"}])</label>
                <textarea class="formular-textarea" id="schul-ferien" rows="3">${UI.escapeHtml(einstellungen.schulFerien)}</textarea>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primaer" id="einstellungen-speichern-btn">
                💾 Einstellungen speichern
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Backup Verwaltung -->
      <div class="karte" style="margin-top: 20px;">
        <div class="karte-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="karte-icon karte-icon-warnung">🛡️</div>
          <div style="flex: 1; min-width: 200px;">
            <div class="karte-titel">Backups (Sicherungen)</div>
            <div class="karte-untertitel">Datenbank-Backups verwalten und wiederherstellen</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-primaer btn-klein" id="backup-erstellen-btn">Backup jetzt erstellen</button>
          </div>
        </div>
        <div class="karte-koerper">
          ${backups.length === 0 ? UI.leereListeHtml('🛡️', 'Noch keine Backups vorhanden.') : `
            <div class="tabelle-container">
              <table class="tabelle">
                <thead>
                  <tr>
                    <th>Dateiname</th>
                    <th>Datum</th>
                    <th>Größe</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  ${backups.map(b => `
                    <tr>
                      <td><strong>${UI.escapeHtml(b.filename)}</strong></td>
                      <td>${new Date(b.createdAt).toLocaleString('de-DE')}</td>
                      <td>${(b.sizeBytes / 1024).toFixed(2)} KB</td>
                      <td>
                        <button class="btn btn-gefahr btn-klein backup-restore-btn" data-file="${UI.escapeHtml(b.filename)}">
                          Wiederherstellen
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    // SMTP-Test
    document.getElementById('smtp-test-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      UI.btnLaden(btn, true);
      try {
        await API.adminSmtpTesten({
          smtpHost: document.getElementById('smtp-host').value.trim(),
          smtpPort: document.getElementById('smtp-port').value.trim(),
          smtpUser: document.getElementById('smtp-user').value.trim(),
          smtpPass: document.getElementById('smtp-pass').value || '••••••••',
          smtpFrom: document.getElementById('smtp-from').value.trim(),
        });
        UI.erfolg('SMTP-Verbindung erfolgreich! ✅');
      } catch (err) {
        UI.fehler(`SMTP-Test fehlgeschlagen: ${err.message}`);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Einstellungen speichern
    document.getElementById('einstellungen-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('einstellungen-speichern-btn');
      UI.btnLaden(btn, true);

      try {
        await API.adminEinstellungenSpeichern({
          pokeWebhookUrl: document.getElementById('poke-url').value.trim(),
          pokeApiKey: document.getElementById('poke-key').value || '••••••••',
          smtpHost: document.getElementById('smtp-host').value.trim(),
          smtpPort: document.getElementById('smtp-port').value.trim(),
          smtpUser: document.getElementById('smtp-user').value.trim(),
          smtpPass: document.getElementById('smtp-pass').value || '••••••••',
          smtpFrom: document.getElementById('smtp-from').value.trim(),
          appUrl: document.getElementById('app-url').value.trim(),
          schulDashboardEnabled: document.getElementById('schul-dashboard-global').checked,
          schulStartzeit: document.getElementById('schul-startzeit').value,
          schulEndzeit: document.getElementById('schul-endzeit').value,
          schulWochentage: document.getElementById('schul-wochentage').value.trim(),
          schulZeitzone: document.getElementById('schul-zeitzone').value.trim(),
          schulFerien: document.getElementById('schul-ferien').value.trim()
        });
        UI.erfolg('Einstellungen gespeichert! ✅');
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Backup erstellen
    document.getElementById('backup-erstellen-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      UI.btnLaden(btn, true);
      try {
        await API.adminBackupErstellen();
        UI.erfolg('Backup erfolgreich erstellt!');
        await this.tabLaden('einstellungen'); // Reload view
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Backup wiederherstellen
    document.querySelectorAll('.backup-restore-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const file = e.target.dataset.file;
        if (!confirm(`WARNUNG: Möchtest du das Backup '${file}' wirklich wiederherstellen? Alle aktuellen Daten werden überschrieben!`)) return;
        
        UI.btnLaden(e.target, true);
        try {
          await API.adminBackupWiederherstellen(file);
          UI.modalZeigen(`
            <div class="modal-header">
              <span class="modal-titel">✅ Wiederherstellung erfolgreich</span>
            </div>
            <div class="modal-koerper">
              <p>Das Backup wurde erfolgreich eingespielt. Der Server startet jetzt neu.</p>
              <p>Die Seite wird in wenigen Sekunden neu geladen...</p>
            </div>
          `);
          setTimeout(() => window.location.reload(), 3000);
        } catch (err) {
          UI.fehler(err.message);
          UI.btnLaden(e.target, false);
        }
      });
    });
  },

  async auditLogsLaden(container) {
    try {
      const logs = await API.adminAuditLogsLaden();
      
      const renderDetails = (detailsStr) => {
        try {
          if (!detailsStr) return '-';
          const obj = JSON.parse(detailsStr);
          if (Object.keys(obj).length === 0) return '-';
          return Object.entries(obj).map(([k, v]) => `<strong>${UI.escapeHtml(k)}:</strong> ${UI.escapeHtml(String(v))}`).join('<br>');
        } catch {
          return UI.escapeHtml(detailsStr);
        }
      };

      container.innerHTML = `
        <div class="admin-panel-karte">
          <h3>📜 Audit Log</h3>
          <p style="color: var(--farbe-text-schwach); margin-bottom: 20px;">Die neuesten Aktivitäten im System.</p>
          <div class="tabelle-container" style="max-height: 600px; overflow-y: auto;">
            <table class="tabelle">
              <thead>
                <tr>
                  <th style="width: 150px;">Zeitpunkt</th>
                  <th style="width: 150px;">Aktion</th>
                  <th style="width: 120px;">Nutzer</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${logs.length === 0 ? '<tr><td colspan="4" style="text-align: center;">Noch keine Einträge.</td></tr>' : logs.map(l => `
                  <tr>
                    <td style="white-space: nowrap; font-size: 12px;">${UI.datumFormatieren(l.created_at)}</td>
                    <td><span class="label" style="background: rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 6px;">${UI.escapeHtml(l.action)}</span></td>
                    <td>${l.user_name ? UI.escapeHtml(l.user_name) : '<em>System</em>'}</td>
                    <td style="font-size: 13px; color: var(--farbe-text-schwach); line-height: 1.4;">${renderDetails(l.details)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="info-box fehler">⚠️ Fehler beim Laden des Audit Logs: ${err.message}</div>`;
    }
  },

  // ─── Poke-Profile ───────────────────────────────────────────────────────

  async pokeProfileRendern(container) {
    const profile = await API.adminPokeProfileLaden();

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="margin:0;">Poke-Profile verwalten</h3>
        <button id="admin-neues-profil-btn" class="btn btn-primaer btn-klein">➕ Neues Profil</button>
      </div>
      <p class="hinweis-text" style="margin-bottom:20px;">
        Hier kannst du verschiedene Profile (Bots) anlegen, die mit unterschiedlichen Webhook-URLs und API-Keys arbeiten. 
        Nutzer können so z.B. private oder berufliche Instanzen auswählen. Das Standard-Profil wird verwendet, wenn kein anderes Profil gewählt wurde.
      </p>
      
      <div class="karten-grid">
    `;

    if (profile.length === 0) {
      html += `<p>Keine Poke-Profile gefunden.</p>`;
    } else {
      profile.forEach(p => {
        html += `
          <div class="karte" style="border-left: 4px solid ${p.farbe}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h4 style="margin:0; font-size:1.2rem;">${UI.escapeHtml(p.icon)} ${UI.escapeHtml(p.name)}</h4>
                ${p.ist_standard ? '<span class="status-badge" style="background:#3b82f6;">Standard</span>' : ''}
              </div>
              <p style="margin-bottom:5px; font-size:0.85rem; color:var(--text-sekundaer);">
                <strong>Webhook:</strong> ${UI.escapeHtml(p.webhook_url.substring(0, 30))}...
              </p>
            </div>
            <div style="margin-top:15px; display:flex; gap:10px;">
              <button class="btn btn-sekundaer btn-klein btn-profil-bearbeiten" data-id="${p.id}">✏️ Bearbeiten</button>
              ${!p.ist_standard ? `<button class="btn btn-notfall btn-klein btn-profil-loeschen" data-id="${p.id}">🗑️ Löschen</button>` : ''}
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;

    // Events binden
    document.getElementById('admin-neues-profil-btn')?.addEventListener('click', () => this.profilModalOeffnen());

    document.querySelectorAll('.btn-profil-bearbeiten').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = profile.find(pr => pr.id == btn.dataset.id);
        if (p) this.profilModalOeffnen(p);
      });
    });

    document.querySelectorAll('.btn-profil-loeschen').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Möchtest du dieses Profil wirklich löschen?')) return;
        try {
          await API.adminPokeProfilLoeschen(btn.dataset.id);
          await this.tabLaden('poke-profile');
          UI.erfolg('Profil gelöscht.');
        } catch (err) {
          UI.fehler(err.message);
        }
      });
    });
  },

  profilModalOeffnen(profil = null) {
    const isEdit = !!profil;
    const formHtml = `
      <form id="profil-form" style="display:flex; flex-direction:column; gap:15px;">
        <div class="formular-gruppe">
          <label class="formular-label">Name</label>
          <input type="text" id="prof-name" class="eingabefeld" value="${isEdit ? UI.escapeHtml(profil.name) : ''}" required>
        </div>
        <div style="display:flex; gap:15px;">
          <div class="formular-gruppe" style="flex:1;">
            <label class="formular-label">Icon (Emoji)</label>
            <input type="text" id="prof-icon" class="eingabefeld" value="${isEdit ? UI.escapeHtml(profil.icon) : '🤖'}" required>
          </div>
          <div class="formular-gruppe" style="flex:1;">
            <label class="formular-label">Farbe (HEX)</label>
            <input type="color" id="prof-farbe" style="height:38px; width:100%; cursor:pointer;" value="${isEdit ? UI.escapeHtml(profil.farbe) : '#3b82f6'}" required>
          </div>
        </div>
        <div class="formular-gruppe">
          <label class="formular-label">Pushover Webhook URL</label>
          <input type="url" id="prof-webhook" class="eingabefeld" value="${isEdit ? UI.escapeHtml(profil.webhook_url) : ''}" required>
        </div>
        <div class="formular-gruppe">
          <label class="formular-label">API Key (Token)</label>
          <input type="password" id="prof-apikey" class="eingabefeld" value="" placeholder="${isEdit && profil.api_key_gesetzt ? 'Gespeicherter Key bleibt unverändert' : 'Bearer-Token eingeben'}" ${isEdit ? '' : 'required'}>
        </div>
        <div class="formular-gruppe" style="display:flex; align-items:center; gap:10px;">
          <input type="checkbox" id="prof-standard" ${isEdit && profil.ist_standard ? 'checked' : ''}>
          <label for="prof-standard">Als Standard-Profil festlegen</label>
        </div>
        <button type="submit" class="btn btn-primaer">💾 Speichern</button>
      </form>
    `;

    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">${isEdit ? '✏️ Profil bearbeiten' : '➕ Neues Profil'}</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        ${formHtml}
      </div>
    `);

    document.getElementById('profil-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      UI.btnLaden(btn, true);

      const daten = {
        name: document.getElementById('prof-name').value,
        icon: document.getElementById('prof-icon').value,
        farbe: document.getElementById('prof-farbe').value,
        webhook_url: document.getElementById('prof-webhook').value,
        api_key: document.getElementById('prof-apikey').value,
        ist_standard: document.getElementById('prof-standard').checked ? 1 : 0
      };

      try {
        if (isEdit) {
          await API.adminPokeProfilBearbeiten(profil.id, daten);
          UI.erfolg('Profil aktualisiert.');
        } else {
          await API.adminPokeProfilErstellen(daten);
          UI.erfolg('Profil erstellt.');
        }
        UI.modalSchliessen();
        await this.tabLaden('poke-profile');
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(btn, false);
      }
    });
  }
};
