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

            <!-- Kombiniertes Nachrichten-Formular -->
            <div class="karte nachrichten-karte" id="kombi-karte">
              <div class="karte-header">
                <div class="karte-icon karte-icon-primaer" id="kombi-icon" style="transition: all 0.3s;">💬</div>
                <div>
                  <div class="karte-titel">Nachricht an Poke</div>
                  <div class="karte-untertitel">Wähle die Art deiner Nachricht</div>
                </div>
              </div>
              <div class="karte-koerper">
                
                <div id="kombi-warnung" class="info-box warnung versteckt" style="margin-bottom: 20px;">
                  <span>⚡</span>
                  <span>Poke leitet diese Nachricht sofort per Pushover an Ruwen weiter.</span>
                </div>

                <form id="kombi-formular">
                  <!-- Prioritäts-Auswahl (Art) -->
                  <div class="formular-gruppe">
                    <label class="formular-label">Art der Nachricht</label>
                    <div class="prioritaet-auswahl" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                      <div class="prioritaet-option">
                        <input type="radio" id="typ-standard" name="nachricht_typ" value="standard" checked>
                        <label class="prioritaet-label" for="typ-standard">
                          <span class="prioritaet-emoji">💬</span>
                          <span class="prioritaet-name">Standard</span>
                          <span class="prioritaet-beschreibung">Normale Nachricht</span>
                        </label>
                      </div>
                      <div class="prioritaet-option">
                        <input type="radio" id="typ-hoch" name="nachricht_typ" value="hoch">
                        <label class="prioritaet-label" for="typ-hoch">
                          <span class="prioritaet-emoji">⚠️</span>
                          <span class="prioritaet-name">Wichtig</span>
                          <span class="prioritaet-beschreibung">Pushover (Kein Notfall)</span>
                        </label>
                      </div>
                      <div class="prioritaet-option notfall-option">
                        <input type="radio" id="typ-notfall" name="nachricht_typ" value="notfall">
                        <label class="prioritaet-label" for="typ-notfall">
                          <span class="prioritaet-emoji">🚨</span>
                          <span class="prioritaet-name">Notfall</span>
                          <span class="prioritaet-beschreibung">Kritisch - Sofort pushen</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="formular-gruppe">
                    <label class="formular-label" for="kombi-inhalt">Deine Nachricht</label>
                    <div class="textarea-wrapper">
                      <textarea
                        class="formular-textarea"
                        id="kombi-inhalt"
                        placeholder="Was möchtest du Poke mitteilen?"
                        rows="5"
                        maxlength="5000"
                        required
                      ></textarea>
                      <div class="textarea-aktionen">
                        <button type="button" id="retranscribe-btn" class="textarea-aktion-btn versteckt" title="Letzte Aufnahme erneut transkribieren">
                          🔄 Nochmal transkribieren
                        </button>
                        <button type="button" id="clear-btn" class="textarea-aktion-btn" title="Textfeld leeren">
                          Leeren
                        </button>
                        <button type="button" id="mic-btn" class="mic-btn" title="Spracheingabe starten">
                          🎤
                        </button>
                      </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                      <div id="mic-status" class="versteckt" style="font-size: 12px; color: var(--farbe-notfall); font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <span class="pulsing-dot" style="width: 8px; height: 8px; background: var(--farbe-notfall); border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite;"></span>
                        <span id="mic-timer">00:00</span> / 30:00
                      </div>
                      <div class="zeichen-zaehler" id="kombi-zaehler" style="margin-left: auto;">0 / 5000</div>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primaer btn-vollbreite" id="kombi-btn" style="transition: all 0.3s;">
                    <span>📤</span> Nachricht senden
                  </button>
                </form>
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

    // Kombiniertes Formular - Zeichenzähler
    const kombiTextarea = document.getElementById('kombi-inhalt');
    const kombiZaehler = document.getElementById('kombi-zaehler');
    const kombiIcon = document.getElementById('kombi-icon');
    const kombiWarnung = document.getElementById('kombi-warnung');
    const kombiBtn = document.getElementById('kombi-btn');
    const kombiKarte = document.getElementById('kombi-karte');
    
    if (kombiTextarea && kombiZaehler) {
      UI.zeichenZaehler(kombiTextarea, kombiZaehler, 5000);
    }

    // UI-Wechsel bei Auswahl der Art
    document.querySelectorAll('input[name="nachricht_typ"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const typ = e.target.value;
        // Immer zuerst alle Zustände zurücksetzen
        kombiBtn.style.background = '';
        kombiBtn.style.color = '';
        kombiIcon.style.background = '';
        kombiIcon.style.color = '';

        if (typ === 'standard') {
          kombiIcon.textContent = '💬';
          kombiIcon.className = 'karte-icon karte-icon-primaer';
          kombiWarnung.classList.add('versteckt');
          kombiBtn.className = 'btn btn-primaer btn-vollbreite';
          kombiBtn.innerHTML = '<span>📤</span> Nachricht senden';
          kombiKarte.classList.remove('notfall-karte');
        } else if (typ === 'hoch') {
          kombiIcon.textContent = '⚠️';
          kombiIcon.className = 'karte-icon karte-icon-warnung';
          kombiWarnung.classList.remove('versteckt');
          kombiBtn.className = 'btn btn-warnung btn-vollbreite';
          kombiBtn.innerHTML = '<span>⚠️</span> Wichtige Nachricht senden';
          kombiKarte.classList.remove('notfall-karte');
        } else if (typ === 'notfall') {
          kombiIcon.textContent = '🚨';
          kombiIcon.className = 'karte-icon karte-icon-notfall';
          kombiWarnung.classList.remove('versteckt');
          kombiBtn.className = 'btn btn-notfall btn-vollbreite';
          kombiBtn.innerHTML = '<span>🚨</span> Notfall melden';
          kombiKarte.classList.add('notfall-karte');
        }
      });
    });

    // Formular absenden
    let originalTranskript = null;
    let letzterAudioBlob = null;
    
    // UI Elemente (Voice & Hilfstasten)
    const clearBtn = document.getElementById('clear-btn');
    const retranscribeBtn = document.getElementById('retranscribe-btn');
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const micTimer = document.getElementById('mic-timer');

    // Leeren Button
    clearBtn?.addEventListener('click', () => {
      kombiTextarea.value = '';
      kombiTextarea.dispatchEvent(new Event('input'));
    });

    // Erneut Transkribieren Button
    retranscribeBtn?.addEventListener('click', async () => {
      if (!letzterAudioBlob) return;
      
      UI.btnLaden(retranscribeBtn, true);
      const alterPlaceholder = kombiTextarea.placeholder;
      kombiTextarea.placeholder = "Versuche erneute Transkription...";
      
      try {
        const antwort = await API.audioTranskribieren(letzterAudioBlob);
        if (antwort.transkript) {
          const prev = kombiTextarea.value.trim();
          kombiTextarea.value = prev ? prev + '\n' + antwort.transkript : antwort.transkript;
          originalTranskript = antwort.transkript;
          kombiTextarea.dispatchEvent(new Event('input'));
          UI.erfolg('Spracheingabe erfolgreich erneut transkribiert.');
        }
      } catch (err) {
        UI.fehler('Erneute Transkription fehlgeschlagen: ' + err.message);
      } finally {
        kombiTextarea.placeholder = alterPlaceholder;
        UI.btnLaden(retranscribeBtn, false);
      }
    });

    // Mikrofon-Logik
    let mediaRecorder = null;
    let audioChunks = [];
    let recordInterval = null;
    let recordTime = 0;

    const updateMicTimer = () => {
      const m = Math.floor(recordTime / 60).toString().padStart(2, '0');
      const s = (recordTime % 60).toString().padStart(2, '0');
      micTimer.textContent = `${m}:${s}`;
    };

    const stopRecording = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
      clearInterval(recordInterval);
      micStatus.classList.add('versteckt');
      micBtn.classList.remove('aufnahme-aktiv');
      micBtn.innerHTML = '🎤';
    };

    micBtn?.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', async () => {
          letzterAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          retranscribeBtn?.classList.remove('versteckt');

          UI.btnLaden(kombiBtn, true);
          const alterPlaceholder = kombiTextarea.placeholder;
          kombiTextarea.placeholder = "Transkribiere Audio (Deepgram)...";
          
          try {
            const antwort = await API.audioTranskribieren(letzterAudioBlob);
            if (antwort.transkript) {
              const prev = kombiTextarea.value.trim();
              kombiTextarea.value = prev ? prev + '\n' + antwort.transkript : antwort.transkript;
              originalTranskript = antwort.transkript;
              kombiTextarea.dispatchEvent(new Event('input'));
              UI.erfolg('Spracheingabe erfolgreich transkribiert.');
            }
          } catch (err) {
            UI.fehler('Transkription fehlgeschlagen: ' + err.message);
          } finally {
            kombiTextarea.placeholder = alterPlaceholder;
            UI.btnLaden(kombiBtn, false);
          }
        });

        mediaRecorder.start();
        recordTime = 0;
        updateMicTimer();
        micStatus.classList.remove('versteckt');
        micBtn.classList.add('aufnahme-aktiv');
        micBtn.innerHTML = '⏹️';

        recordInterval = setInterval(() => {
          recordTime++;
          updateMicTimer();
          if (recordTime >= 1800) stopRecording(); // Max 30 Min
        }, 1000);

      } catch (err) {
        UI.fehler('Mikrofon-Zugriff verweigert oder nicht möglich.');
      }
    });

    document.getElementById('kombi-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inhalt = kombiTextarea.value.trim();
      const typ = document.querySelector('input[name="nachricht_typ"]:checked').value;
      if (!inhalt) return;

      if (typ !== 'standard') {
        const prioritaetLabel = typ === 'notfall' ? 'Notfallbenachrichtigung' : 'Wichtige Benachrichtigung';
        if (!confirm(`Möchtest du wirklich eine ${prioritaetLabel} senden?`)) return;
      }

      UI.btnLaden(kombiBtn, true);
      try {
        if (typ === 'standard') {
          await API.nachrichtSenden(inhalt, originalTranskript);
        } else {
          await API.notfallSenden(inhalt, typ, originalTranskript);
        }
        
        UI.erfolg('Nachricht erfolgreich an Poke gesendet! ✅');
        kombiTextarea.value = '';
        originalTranskript = null;
        kombiTextarea.dispatchEvent(new Event('input')); // Zeichenzähler zurücksetzen
        await this.verlaufLaden();
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(kombiBtn, false);
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
                ${UI.typBadge(n.typ, n.prioritaet)}
                ${n.prioritaet ? `<div style="margin-top: 4px; font-size: 11px; color: var(--farbe-text-schwach);">${UI.prioritaetText(n.prioritaet)}</div>` : ''}
              </div>
              <div>
                <div class="verlauf-inhalt">${UI.escapeHtml(n.inhalt)}</div>
                ${n.fehler ? `<div style="font-size: 12px; color: var(--farbe-notfall); margin-top: 4px;">⚠️ ${UI.escapeHtml(n.fehler)}</div>` : ''}
                ${UI.renderAntworten(n.antwortText)}
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
