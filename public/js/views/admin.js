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
            <button class="btn btn-ghost btn-klein" id="admin-abmelden-btn">Abmelden</button>
          </div>
        </nav>

        <!-- Hauptinhalt -->
        <main class="hauptinhalt">
          <div class="sektion-titel">⚙️ Admin-Panel</div>

          <!-- Tabs -->
          <div class="admin-tabs" role="tablist">
            <button class="admin-tab aktiv" data-tab="uebersicht" role="tab">📊 Übersicht</button>
            <button class="admin-tab" data-tab="nutzer" role="tab">👥 Nutzer</button>
            <button class="admin-tab" data-tab="nachrichten" role="tab">📨 Nachrichten</button>
            <button class="admin-tab" data-tab="einstellungen" role="tab">🔧 Einstellungen</button>
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
        case 'einstellungen': await this.einstellungenRendern(container); break;
      }
    } catch (err) {
      container.innerHTML = `<div class="info-box fehler"><span>⚠️</span><span>Fehler: ${UI.escapeHtml(err.message)}</span></div>`;
    }
  },

  // ─── Übersicht ──────────────────────────────────────────────────────────

  async uebersichtRendern(container) {
    const stats = await API.adminStatistiken();

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
    `;
  },

  // ─── Nutzer-Verwaltung ──────────────────────────────────────────────────

  async nutzerRendern(container) {
    const nutzer = await API.adminNutzerLaden();

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header" style="padding-bottom: 20px;">
          <div class="karte-icon karte-icon-primaer">👥</div>
          <div style="flex: 1;">
            <div class="karte-titel">Nutzer-Verwaltung</div>
            <div class="karte-untertitel">${nutzer.length} Nutzer insgesamt</div>
          </div>
          <div style="display: flex; gap: 8px;">
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
                      <th>Letzter Login</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${nutzer.map(n => `
                      <tr>
                        <td>
                          <strong>${UI.escapeHtml(n.benutzername)}</strong>
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
                        <td style="color: var(--farbe-text-schwach); font-size: 13px;">${UI.datumFormatieren(n.letzterLogin)}</td>
                        <td>
                          <div class="aktionen-gruppe">
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
      } else {
        UI.erfolg('Neue Einladung gesendet.');
        await this.tabLaden('nutzer');
      }
    } catch (err) {
      UI.fehler(err.message);
    }
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
            <label class="formular-label" for="erstellen-email">E-Mail</label>
            <input class="formular-eingabe" type="email" id="erstellen-email" required autocomplete="off">
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
            <label class="formular-label" for="einladen-email">E-Mail-Adresse</label>
            <input class="formular-eingabe" type="email" id="einladen-email" required autocomplete="off">
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
        );

        if (ergebnis.mailFehler && ergebnis.einladungsToken) {
          UI.modalSchliessen();
          const appUrl = window.location.origin;
          UI.modalZeigen(`
            <div class="modal-header">
              <span class="modal-titel">Einladungslink</span>
              <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
            </div>
            <div class="modal-koerper">
              <div class="info-box warnung" style="margin-bottom: 16px;">
                <span>⚠️</span>
                <span>Nutzer angelegt, aber E-Mail konnte nicht gesendet werden. Teile diesen Link:</span>
              </div>
              <div class="formular-gruppe">
                <input class="formular-eingabe" type="text" value="${appUrl}/#einladung/${ergebnis.einladungsToken}" readonly onclick="this.select()">
              </div>
              <button class="btn btn-primaer btn-vollbreite"
                onclick="navigator.clipboard.writeText('${appUrl}/#einladung/${ergebnis.einladungsToken}'); UI.erfolg('Link kopiert!'); UI.modalSchliessen();">
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
        <div class="karte-header" style="padding-bottom: 20px;">
          <div class="karte-icon karte-icon-info">📨</div>
          <div>
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
                      <div class="verlauf-inhalt" style="margin-top: 4px;">${UI.escapeHtml(n.inhalt)}</div>
                      ${n.fehler ? `<div style="font-size: 12px; color: var(--farbe-notfall); margin-top: 4px;">⚠️ ${UI.escapeHtml(n.fehler)}</div>` : ''}
                      ${n.antwortText ? `
                        <div style="margin-top: 12px; padding: 12px 16px; background: rgba(6, 182, 212, 0.08); border-left: 3px solid var(--farbe-akzent); border-radius: 4px;">
                          <div style="font-size: 11px; color: var(--farbe-akzent); font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 14px;">🤖</span> Poke hat geantwortet (${UI.datumFormatieren(n.antwortDatum)}):
                          </div>
                          <div style="font-size: 13px; color: var(--farbe-text); line-height: 1.5; white-space: pre-wrap;">${UI.escapeHtml(n.antwortText)}</div>
                        </div>
                      ` : ''}
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

    container.innerHTML = `
      <div class="karte">
        <div class="karte-header">
          <div class="karte-icon karte-icon-primaer">🔗</div>
          <div>
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

            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primaer" id="einstellungen-speichern-btn">
                💾 Einstellungen speichern
              </button>
            </div>
          </form>
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
        });
        UI.erfolg('Einstellungen gespeichert! ✅');
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },
};
