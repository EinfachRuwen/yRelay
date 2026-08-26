// yRelay - Dashboard-View (Nutzeransicht)
const DashboardView = {
  rendern(nutzer) {
    const avatarBuchstabe = (nutzer.benutzername || 'U')[0].toUpperCase();

    return `
      <div class="seite haupt-seite">
        <!-- Navigation -->
        <nav class="navbar">
          <span class="navbar-logo">
            <span class="logo-y">y</span><span class="logo-relay">Relay</span>
          </span>
          <div class="navbar-nav">
            <div class="nav-nutzer">
              <div class="nav-avatar">${UI.escapeHtml(avatarBuchstabe)}</div>
              <div class="nav-info">
                <span class="nav-name">${UI.escapeHtml(nutzer.benutzername)}</span>
                <span class="nav-rolle">Nutzer</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-klein" id="passwort-btn" title="Passwort ändern">🔒</button>
            <button class="btn btn-ghost btn-klein" id="abmelden-btn">Abmelden</button>
          </div>
        </nav>

        <!-- Hauptinhalt -->
        <main class="hauptinhalt">
          <div class="sektion-titel">👋 Hallo, ${UI.escapeHtml(nutzer.benutzername)}!</div>
          <p class="sektion-untertitel">Sende Nachrichten direkt an den Poke KI-Assistenten.</p>

          <!-- Nachrichten-Kacheln -->
          <div class="dashboard-grid">
            <!-- Freie Nachricht -->
            <div class="karte nachrichten-karte">
              <div class="karte-header">
                <div class="karte-icon karte-icon-primaer">💬</div>
                <div>
                  <div class="karte-titel">Nachricht senden</div>
                  <div class="karte-untertitel">Freie Nachricht an Poke</div>
                </div>
              </div>
              <div class="karte-koerper">
                <form id="nachricht-formular">
                  <div class="formular-gruppe">
                    <label class="formular-label" for="nachricht-inhalt">Deine Nachricht</label>
                    <textarea
                      class="formular-textarea"
                      id="nachricht-inhalt"
                      placeholder="Was möchtest du Poke mitteilen?"
                      rows="5"
                      maxlength="5000"
                      required
                    ></textarea>
                    <div class="zeichen-zaehler" id="nachricht-zaehler">0 / 5000</div>
                  </div>

                  <button type="submit" class="btn btn-primaer btn-vollbreite" id="nachricht-btn">
                    <span>📤</span> Nachricht senden
                  </button>
                </form>
              </div>
            </div>

            <!-- Notfallbenachrichtigung -->
            <div class="karte nachrichten-karte notfall-karte">
              <div class="karte-header">
                <div class="karte-icon karte-icon-notfall">🚨</div>
                <div>
                  <div class="karte-titel">Notfallbenachrichtigung</div>
                  <div class="karte-untertitel">Sofortige Benachrichtigung per Pushover</div>
                </div>
              </div>
              <div class="karte-koerper">
                <div class="info-box warnung" style="margin-bottom: 20px;">
                  <span>⚡</span>
                  <span>Nur für echte Notfälle! Poke leitet deine Nachricht sofort per Pushover an Ruwen weiter.</span>
                </div>

                <form id="notfall-formular">
                  <!-- Prioritäts-Auswahl -->
                  <div class="formular-gruppe">
                    <label class="formular-label">Priorität</label>
                    <div class="prioritaet-auswahl">
                      <div class="prioritaet-option">
                        <input type="radio" id="prio-hoch" name="prioritaet" value="hoch" checked>
                        <label class="prioritaet-label" for="prio-hoch">
                          <span class="prioritaet-emoji">⚠️</span>
                          <span class="prioritaet-name">Hohe Priorität</span>
                          <span class="prioritaet-beschreibung">Wichtig, aber kein Notfall</span>
                        </label>
                      </div>
                      <div class="prioritaet-option notfall-option">
                        <input type="radio" id="prio-notfall" name="prioritaet" value="notfall">
                        <label class="prioritaet-label" for="prio-notfall">
                          <span class="prioritaet-emoji">🚨</span>
                          <span class="prioritaet-name">Notfall</span>
                          <span class="prioritaet-beschreibung">Kritisch - sofort reagieren</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="formular-gruppe">
                    <label class="formular-label" for="notfall-inhalt">Beschreibung / Grund</label>
                    <textarea
                      class="formular-textarea"
                      id="notfall-inhalt"
                      placeholder="Beschreibe kurz den Grund der Benachrichtigung..."
                      rows="4"
                      maxlength="2000"
                      required
                    ></textarea>
                    <div class="zeichen-zaehler" id="notfall-zaehler">0 / 2000</div>
                  </div>

                  <button type="submit" class="btn btn-notfall btn-vollbreite" id="notfall-btn">
                    <span>🚨</span> Notfallbenachrichtigung senden
                  </button>
                </form>
              </div>
            </div>
          </div>

          <!-- Nachrichten-Verlauf -->
          <div class="karte">
            <div class="karte-header" style="padding-bottom: 20px;">
              <div class="karte-icon karte-icon-info">📋</div>
              <div>
                <div class="karte-titel">Meine gesendeten Nachrichten</div>
                <div class="karte-untertitel">Dein Verlauf der letzten 100 Nachrichten</div>
              </div>
            </div>
            <div class="karte-koerper" style="padding-top: 0;">
              <div id="verlauf-inhalt">
                <div class="lade-spinner" style="margin: 20px auto;"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
  },

  async initialisieren(nutzer) {
    // Abmelden
    document.getElementById('abmelden-btn')?.addEventListener('click', () => {
      App.abmelden();
    });

    // Passwort ändern
    document.getElementById('passwort-btn')?.addEventListener('click', () => {
      this.passwortAendernModal();
    });

    // Freie Nachricht - Zeichenzähler
    const nachrichtTextarea = document.getElementById('nachricht-inhalt');
    const nachrichtZaehler = document.getElementById('nachricht-zaehler');
    if (nachrichtTextarea && nachrichtZaehler) {
      UI.zeichenZaehler(nachrichtTextarea, nachrichtZaehler, 5000);
    }

    // Notfall - Zeichenzähler
    const notfallTextarea = document.getElementById('notfall-inhalt');
    const notfallZaehler = document.getElementById('notfall-zaehler');
    if (notfallTextarea && notfallZaehler) {
      UI.zeichenZaehler(notfallTextarea, notfallZaehler, 2000);
    }

    // Freie Nachricht senden
    document.getElementById('nachricht-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('nachricht-btn');
      const inhalt = document.getElementById('nachricht-inhalt').value.trim();
      if (!inhalt) return;

      UI.btnLaden(btn, true);
      try {
        await API.nachrichtSenden(inhalt);
        UI.erfolg('Nachricht erfolgreich an Poke gesendet! ✅');
        document.getElementById('nachricht-inhalt').value = '';
        nachrichtZaehler.textContent = '0 / 5000';
        await this.verlaufLaden();
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Notfall senden
    document.getElementById('notfall-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('notfall-btn');
      const inhalt = document.getElementById('notfall-inhalt').value.trim();
      const prioritaet = document.querySelector('input[name="prioritaet"]:checked')?.value || 'hoch';
      if (!inhalt) return;

      const prioritaetLabel = prioritaet === 'notfall' ? 'Notfallbenachrichtigung' : 'Hohe-Priorität-Benachrichtigung';

      if (!confirm(`Möchtest du wirklich eine ${prioritaetLabel} senden?`)) return;

      UI.btnLaden(btn, true);
      try {
        await API.notfallSenden(inhalt, prioritaet);
        UI.erfolg(`${prioritaetLabel} erfolgreich gesendet! Poke wurde informiert. 🚨`);
        document.getElementById('notfall-inhalt').value = '';
        notfallZaehler.textContent = '0 / 2000';
        await this.verlaufLaden();
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Verlauf laden
    await this.verlaufLaden();
  },

  async verlaufLaden() {
    const container = document.getElementById('verlauf-inhalt');
    if (!container) return;

    try {
      const nachrichten = await API.meineNachrichten();
      if (nachrichten.length === 0) {
        container.innerHTML = UI.leereListeHtml('📭', 'Noch keine Nachrichten gesendet.');
        return;
      }

      container.innerHTML = `
        <div class="verlauf-liste">
          ${nachrichten.map(n => `
            <div class="verlauf-eintrag">
              <div>
                ${UI.typBadge(n.typ)}
                ${n.prioritaet ? `<div style="margin-top: 4px; font-size: 11px; color: var(--farbe-text-schwach);">${UI.prioritaetText(n.prioritaet)}</div>` : ''}
              </div>
              <div>
                <div class="verlauf-inhalt">${UI.escapeHtml(n.inhalt)}</div>
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
      `;
    } catch (err) {
      container.innerHTML = `<div class="info-box fehler"><span>⚠️</span><span>Verlauf konnte nicht geladen werden: ${UI.escapeHtml(err.message)}</span></div>`;
    }
  },

  passwortAendernModal() {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">🔒 Passwort ändern</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()">✕</button>
      </div>
      <div class="modal-koerper">
        <form id="passwort-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="altes-pw">Aktuelles Passwort</label>
            <input class="formular-eingabe" type="password" id="altes-pw" autocomplete="current-password" required>
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="neues-pw">Neues Passwort</label>
            <input class="formular-eingabe" type="password" id="neues-pw" autocomplete="new-password" minlength="8" required placeholder="Mindestens 8 Zeichen">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" for="neues-pw2">Neues Passwort bestätigen</label>
            <input class="formular-eingabe" type="password" id="neues-pw2" autocomplete="new-password" required>
          </div>
          <div id="pw-fehler" class="info-box fehler versteckt" style="margin-bottom: 12px;"><span>⚠️</span><span id="pw-fehler-text"></span></div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" style="flex: 1;" id="pw-speichern-btn">Passwort ändern</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('passwort-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('pw-speichern-btn');
      const fehlerBox = document.getElementById('pw-fehler');
      const fehlerText = document.getElementById('pw-fehler-text');
      const altes = document.getElementById('altes-pw').value;
      const neues = document.getElementById('neues-pw').value;
      const neues2 = document.getElementById('neues-pw2').value;

      fehlerBox.classList.add('versteckt');

      if (neues !== neues2) {
        fehlerText.textContent = 'Die neuen Passwörter stimmen nicht überein.';
        fehlerBox.classList.remove('versteckt');
        return;
      }

      UI.btnLaden(btn, true);
      try {
        await API.passwortAendern(altes, neues);
        UI.modalSchliessen();
        UI.erfolg('Passwort erfolgreich geändert.');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },
};
