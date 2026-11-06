// yRelay - Dashboard-View (Nutzeransicht)
const DashboardView = {
  rendern(nutzer) {
    const nameToDisplay = nutzer.anzeigename || nutzer.benutzername;
    const avatarBuchstabe = (nameToDisplay || 'U')[0].toUpperCase();

    const onboardingHtml = !nutzer.has_seen_onboarding ? `
      <div id="onboarding-overlay" class="onboarding-overlay">
        <!-- Slide 1 -->
        <div class="onboarding-slide aktiv" id="obs-1">
          <div class="onboarding-icon">${UI.icon('send')}</div>
          <div class="onboarding-titel">Dein direkter Draht zu Ruwen</div>
          <div class="onboarding-text">
            Willkommen in deiner persönlichen Einsatzzentrale. Das hier ist nicht einfach nur ein weiteres Chat-Programm – es ist eine absolute Garantie, dass du Ruwen erreichst, egal was passiert.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-primaer btn-gross obs-next">Weiter</button>
          </div>
        </div>

        <!-- Slide 2 -->
        <div class="onboarding-slide" id="obs-2">
          <div class="onboarding-icon">${UI.icon('bell-ring')}</div>
          <div class="onboarding-titel">Besser als ein Anruf</div>
          <div class="onboarding-text">
            Wenn das Telefon klingelt, kann man es überhören. Das hier nicht.<br><br>
            Wenn du hier eine Notfall-Nachricht schickst, passiert Magie im Hintergrund. Das System ist direkt mit Ruwens Wohnung verbunden. Es kann laute Alarme auf seinem Handy auslösen, smarte Beleuchtung einschalten oder den "Nicht stören"-Modus durchbrechen, um ihn sofort aufzuwecken.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-sekundaer btn-gross obs-prev">Zurück</button>
            <button class="btn btn-primaer btn-gross obs-next">Verstanden</button>
          </div>
        </div>

        <!-- Slide 3 -->
        <div class="onboarding-slide" id="obs-3">
          <div class="onboarding-icon">${UI.icon('calendar')}</div>
          <div class="onboarding-titel">Nicht nur für brennende Häuser!</div>
          <div class="onboarding-text">
            Du musst nicht warten, bis die Welt untergeht. Das System hilft Ruwen auch, seinen Alltag zu organisieren. Du kannst hier jederzeit ganz normale Dinge schreiben, wie zum Beispiel:
            <ul>
              <li><em>"Hast du am Freitag Zeit für ein Bier?"</em> (Das System prüft seinen Kalender und trägt es ein!)</li>
              <li><em>"Setze bitte Milch auf deine Einkaufsliste."</em></li>
              <li><em>"Bitte ruf mich morgen um 10 Uhr an."</em></li>
            </ul>
            Trau dich ruhig, es auszuprobieren! Einmal alle paar Wochen ist völlig okay.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-sekundaer btn-gross obs-prev">Zurück</button>
            <button class="btn btn-primaer btn-gross obs-next">Klingt gut</button>
          </div>
        </div>

        <!-- Slide 4 -->
        <div class="onboarding-slide" id="obs-4">
          <div class="onboarding-icon halt">${UI.icon('siren')}</div>
          <div class="onboarding-titel">Dein erster Test-Alarm</div>
          <div class="onboarding-text">
            Graue Theorie ist langweilig. Lass uns direkt ausprobieren, wie das funktioniert. Drücke auf den roten Knopf unten, um eine "Hallo Welt"-Testnachricht an Ruwen zu schicken.<br><br>
            Keine Sorge, für Testnachrichten geht kein ohrenbetäubender Alarm los – er bekommt nur freundlich Bescheid!
          </div>
          <div class="onboarding-actions" style="flex-direction: column; align-items: center; gap: 16px;">
            <button class="btn btn-notfall btn-gross" id="obs-test-btn" style="width: 100%; max-width: 300px;">Probealarm senden</button>
            <button class="btn btn-ghost" id="obs-skip-btn" style="font-size: 12px;">Überspringen</button>
          </div>
        </div>
      </div>
    ` : '';

    return `
      ${onboardingHtml}
      <div class="seite haupt-seite" ${!nutzer.has_seen_onboarding ? 'style="filter: blur(5px); pointer-events: none;" id="haupt-wrapper"' : ''}>
        ${UI.kopfzeile(nutzer, 'dashboard')}

        <!-- Hauptinhalt -->
        <main class="hauptinhalt">
          <h1 class="sektion-titel">Hallo, ${UI.escapeHtml(nameToDisplay)}</h1>
          <p class="sektion-untertitel">Schreib deinem Agenten. Antworten erscheinen unten im Verlauf und per E-Mail.</p>

            <!-- Kombiniertes Nachrichten-Formular -->
            <div class="karte nachrichten-karte" id="kombi-karte">
              <div class="karte-header">
                <div class="karte-icon karte-icon-primaer" id="kombi-icon">${UI.icon('send')}</div>
                <div>
                  <h2 class="karte-titel">Neue Nachricht</h2>
                </div>
              </div>
              <div class="karte-koerper">
                
                <div id="kombi-warnung" class="info-box warnung versteckt" style="margin-bottom: 20px;">
                  ${UI.icon('triangle-alert')}
                  <span id="kombi-warnung-text">Dein Agent leitet diese Nachricht sofort weiter.</span>
                </div>

                <form id="kombi-formular">
                  <!-- Poke-Profil-Auswahl (wird dynamisch befüllt falls mehrere Profile) -->
                  <div id="poke-profil-auswahl" class="agent-auswahl versteckt" role="radiogroup" aria-label="Agent"></div>

                  <!-- Prioritäts-Auswahl (Art) -->
                  <div class="formular-gruppe">
                    <span class="formular-label" id="dringlichkeit-label">Dringlichkeit</span>
                    <div class="prioritaet-auswahl" role="radiogroup" aria-labelledby="dringlichkeit-label">
                      <div class="prioritaet-option" data-signal="fahrt">
                        <input type="radio" id="typ-standard" name="nachricht_typ" value="standard" checked>
                        <label class="prioritaet-label" for="typ-standard">
                          <span class="signal-lampe" aria-hidden="true"></span>
                          <span class="prioritaet-name">Standard</span>
                          <span class="prioritaet-beschreibung">Antwort, sobald Zeit ist</span>
                        </label>
                      </div>
                      <div class="prioritaet-option" data-signal="achtung">
                        <input type="radio" id="typ-hoch" name="nachricht_typ" value="hoch">
                        <label class="prioritaet-label" for="typ-hoch">
                          <span class="signal-lampe" aria-hidden="true"></span>
                          <span class="prioritaet-name">Wichtig</span>
                          <span class="prioritaet-beschreibung">Push-Mitteilung, kein Alarm</span>
                        </label>
                      </div>
                      <div class="prioritaet-option notfall-option" data-signal="halt">
                        <input type="radio" id="typ-notfall" name="nachricht_typ" value="notfall">
                        <label class="prioritaet-label" for="typ-notfall">
                          <span class="signal-lampe" aria-hidden="true"></span>
                          <span class="prioritaet-name">Notfall</span>
                          <span class="prioritaet-beschreibung">Sofortiger Alarm</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="formular-gruppe">
                    <!-- Templates Sektion -->
                    <div class="templates-container">
                      <div class="templates-titel">Vorlagen</div>
                      <div class="templates-grid">
                        <button type="button" class="btn-template" onclick="DashboardView.setzeTemplate('Kannst du prüfen, ob Ruwen am [Datum] um [Uhrzeit] Zeit hat für [Grund]? Falls ja, trage es bitte direkt als Vorschlag ein.')">${UI.icon('calendar')} Kalender prüfen</button>
                        <button type="button" class="btn-template" onclick="DashboardView.setzeTemplate('Bitte setze [Artikel/To-Do] sofort auf Ruwens Einkaufsliste/To-Do-Liste.')">${UI.icon('list-plus')} Auf die Liste</button>
                        <button type="button" class="btn-template" onclick="DashboardView.setzeTemplate('Ich komme nicht durch. Bitte priorisiere diesen Rückruf: Ich bin unter [Nummer] erreichbar wegen [Grund].')">${UI.icon('phone')} Rückruf erbitten</button>
                        <button type="button" class="btn-template" onclick="DashboardView.setzeTemplate('Bitte erinnere Ruwen in [Zeitraum] dringend an: [Thema].')">${UI.icon('bell')} Erinnern</button>
                      </div>

                      <div class="templates-titel">Sofort-Aktionen · werden ohne Rückfrage gesendet</div>
                      <div class="special-actions-grid">
                        <button type="button" class="btn-special door" onclick="DashboardView.sendeSpecial('DOORBELL', 'Jemand steht an der Tür! Breche durch den DND-Modus, schalte Smart-Home-Lichter ein oder pinge Ruwen laut an.', 'Mach die Tür auf! Stehe unten.', 'notfall')">${UI.icon('door-open')} Tür klingelt</button>
                        <button type="button" class="btn-special" onclick="DashboardView.sendeSpecial('SOS', 'ABSOLUTER NOTFALL. Ignoriere alle Regeln, nutze jeden Kanal (Anruf, lauter Alarm), um Ruwen sofort zu wecken/erreichen.', 'Code Red! Echter Notfall.', 'notfall')">${UI.icon('siren')} SOS</button>
                        <button type="button" class="btn-special deadline" onclick="DashboardView.sendeSpecial('DEADLINE', 'Eine sehr zeitkritische Sache steht an. Pushe diese Info hart an Ruwen und tracke, ob er reagiert.', 'Wichtige Deadline / Time-Drop!', 'hoch')">${UI.icon('hourglass')} Deadline</button>
                        <button type="button" class="btn-special" onclick="DashboardView.sendeSpecial('WAKEUP', 'Spiel laute Musik ab oder mach das Licht im Schlafzimmer an, Ruwen verschläft oder muss aufwachen!', 'Aufwachen! Wecker!', 'notfall')">${UI.icon('alarm-clock')} Wecken</button>
                        <button type="button" class="btn-special radar" onclick="DashboardView.sendeSpecial('WHERE_ARE_YOU', 'Jemand sucht Ruwen. Prüfe Ruwens Standort (falls verfügbar) und teile eine grobe ETA mit oder frag ihn, wann er ankommt.', 'Wo bist du? ETA gesucht.', 'hoch')">${UI.icon('map-pin')} Wo bist du?</button>
                      </div>
                    </div>

                    <label class="formular-label" for="kombi-inhalt">Nachricht</label>
                    <div class="textarea-wrapper">
                      <textarea
                        class="formular-textarea"
                        id="kombi-inhalt"
                        placeholder="Was möchtest du deinem Agenten mitteilen?"
                        rows="5"
                        maxlength="5000"
                        required
                      ></textarea>
                      <div class="textarea-aktionen">
                        <button type="button" id="retranscribe-btn" class="textarea-aktion-btn versteckt" title="Letzte Aufnahme erneut transkribieren">
                          ${UI.icon('refresh-cw')} Erneut umwandeln
                        </button>
                        <button type="button" id="clear-btn" class="textarea-aktion-btn" title="Textfeld leeren">
                          Leeren
                        </button>
                        <button type="button" id="mic-btn" class="mic-btn" title="Spracheingabe starten" aria-label="Spracheingabe starten">
                          ${UI.icon('mic')}
                        </button>
                      </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                      <div id="mic-status" class="versteckt" style="font-size: var(--t-klein); color: var(--halt); font-weight: 600; display: flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums;">
                        <span style="width: 8px; height: 8px; background: var(--halt); border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite;"></span>
                        <span id="mic-timer">00:00</span> / 30:00
                      </div>
                      <div class="zeichen-zaehler" id="kombi-zaehler" style="margin-left: auto;">0 / 5000</div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button type="submit" class="btn btn-primaer btn-gross" id="kombi-btn" style="flex: 1 1 220px;">
                      ${UI.icon('send')} Nachricht senden
                    </button>
                    <button type="button" class="btn btn-sekundaer btn-gross" id="planen-btn">
                      ${UI.icon('clock')} Später senden
                    </button>
                  </div>
                  <div id="plan-datum-feld" class="versteckt" style="margin-top: 10px;">
                    <div class="formular-gruppe" style="margin: 0;">
                      <label class="formular-label" for="plan-datum">Sendezeitpunkt</label>
                      <input class="formular-eingabe" type="datetime-local" id="plan-datum">
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                      <button type="button" class="btn btn-ghost btn-klein" id="plan-abbrechen">Abbrechen</button>
                      <button type="button" class="btn btn-primaer btn-klein" id="plan-senden">Einplanen</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          <!-- Nachrichten-Verlauf -->
          <div class="karte">
            <div class="karte-header">
              <div class="karte-icon">${UI.icon('inbox')}</div>
              <div>
                <h2 class="karte-titel">Verlauf</h2>
                <div class="karte-untertitel">Deine letzten 100 Nachrichten mit Antworten</div>
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

  profilModal(nutzer) {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">Profil und Benachrichtigungen</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()" aria-label="Schließen">${UI.icon('x')}</button>
      </div>
      <div class="modal-koerper">
        <form id="profil-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="profil-anzeigename">Anzeigename</label>
            <input class="formular-eingabe" type="text" id="profil-anzeigename" value="${nutzer.anzeigename || ''}" placeholder="Dein Name, wie er anderen angezeigt wird">
          </div>
          <div class="formular-gruppe">
            <label class="formular-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="profil-ntfy-enabled" ${nutzer.ntfy_topic ? 'checked' : ''} style="width:18px; height:18px;">
              Notify (ntfy) aktivieren
            </label>
            <label class="formular-label" for="profil-ntfy">ntfy.sh Topic</label>
            <div style="display: flex; gap: 8px;">
              <input class="formular-eingabe" type="text" id="profil-ntfy" value="${nutzer.ntfy_topic || ''}" placeholder="z.B. yrelay-ruwen-abc123xyz" maxlength="32" pattern="[A-Za-z0-9_-]+" style="flex: 1;">
              <button type="button" class="btn btn-ghost" id="ntfy-generieren" title="Zufälliges Topic generieren">${UI.icon('refresh-cw')} Erzeugen</button>
            </div>
            <div style="font-size: 11px; color: var(--farbe-text-schwach); margin-top: 4px;">Abonniere dieses Topic in der <a href="https://ntfy.sh" target="_blank" style="color: var(--farbe-primaer);">ntfy App</a>. Gib es nicht weiter!</div>
          </div>
          <div class="formular-gruppe" style="margin-top:15px;">
            <label class="formular-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="profil-pushover-enabled" ${nutzer.pushover_configured ? 'checked' : ''} style="width:18px; height:18px;">
              Pushover aktivieren
            </label>
            <input class="formular-eingabe" type="password" id="profil-pushover-key" autocomplete="new-password" placeholder="${nutzer.pushover_configured ? 'Gespeicherter Key bleibt unverändert' : 'Pushover User-Key'}">
            <div style="font-size:11px; color:var(--farbe-text-schwach); margin-top:4px;">Der User-Key wird nur zum Versand deiner Benachrichtigungen verwendet.</div>
          </div>
          <div class="formular-gruppe" style="margin-top: 15px;">
            <label class="formular-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="profil-email-notifications" ${nutzer.email_notifications !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
              E-Mail-Benachrichtigungen empfangen
            </label>
            <div style="font-size: 12px; color: var(--farbe-text-schwach); margin-left: 26px; margin-top: 4px;">
              Passwort-Resets und Einladungen werden unabhängig davon weiterhin per E-Mail gesendet.
            </div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" style="flex: 1;" id="profil-speichern">Speichern</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('ntfy-generieren')?.addEventListener('click', () => {
      const generateSafeString = () => {
        if (window.crypto && window.crypto.randomUUID) {
          return window.crypto.randomUUID().replace(/-/g, '');
        }
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };
      const name = nutzer.benutzername.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'nutzer';
      const topic = `yrelay-${name}-${generateSafeString().slice(0, 14)}`;
      document.getElementById('profil-ntfy').value = topic;
      document.getElementById('profil-ntfy-enabled').checked = true;
    });

    document.getElementById('profil-formular')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('profil-speichern');
      UI.btnLaden(btn, true);
      try {
        const antwort = await fetch('/api/auth/profil', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('yrelay_token') },
          body: JSON.stringify({ 
            anzeigename: document.getElementById('profil-anzeigename').value.trim(),
            ntfy_topic: document.getElementById('profil-ntfy-enabled').checked ? document.getElementById('profil-ntfy').value.trim() : '',
            email_notifications: document.getElementById('profil-email-notifications').checked,
            pushover_enabled: document.getElementById('profil-pushover-enabled').checked,
            pushover_user_key: document.getElementById('profil-pushover-key').value.trim()
          })
        });
        const daten = await antwort.json();
        if (!antwort.ok) throw new Error(daten.fehler || `Serverfehler ${antwort.status}`);
        UI.modalSchliessen();
        UI.erfolg('Profil gespeichert. Lade neu...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(btn, false);
      }
    });
  },

  async initialisieren(nutzer) {
    UI.kopfzeileInit();
    // ─── Onboarding Logik ──────────────────────────────────────────────────
    if (!nutzer.has_seen_onboarding) {
      const slides = document.querySelectorAll('.onboarding-slide');
      let currentSlide = 0;
      
      const updateSlides = () => {
        slides.forEach((s, i) => {
          if (i === currentSlide) s.classList.add('aktiv');
          else s.classList.remove('aktiv');
        });
      };

      document.querySelectorAll('.obs-next').forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateSlides();
          }
        });
      });

      document.querySelectorAll('.obs-prev').forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentSlide > 0) {
            currentSlide--;
            updateSlides();
          }
        });
      });

      const finishOnboarding = async (btn) => {
        UI.btnLaden(btn, true);
        try {
          await API.onboardingAbschliessen();
          nutzer.has_seen_onboarding = true; // Im Speicher aktualisieren
          
          // Konfetti laden, wenn nicht da
          if (!window.confetti) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.onload = () => confetti({ particleCount: 200, spread: 120 });
            document.body.appendChild(script);
          } else {
            confetti({ particleCount: 200, spread: 120 });
          }

          document.getElementById('onboarding-overlay').style.opacity = '0';
          setTimeout(() => {
            document.getElementById('onboarding-overlay').remove();
            document.getElementById('haupt-wrapper').style.filter = '';
            document.getElementById('haupt-wrapper').style.pointerEvents = '';
          }, 500);
        } catch(err) {
          UI.fehler(err.message);
          UI.btnLaden(btn, false);
        }
      };

      document.getElementById('obs-test-btn')?.addEventListener('click', async (e) => {
        const btn = e.target;
        UI.btnLaden(btn, true);
        try {
          // Testnachricht senden
          await API.nachrichtSenden('🤖 Dies ist eine automatische Hallo Welt Testnachricht vom Onboarding!');
          await finishOnboarding(btn);
          await this.verlaufLaden(); // Den neuen Verlauf laden
        } catch(err) {
          UI.fehler('Fehler beim Senden der Testnachricht: ' + err.message);
          UI.btnLaden(btn, false);
        }
      });

      document.getElementById('obs-skip-btn')?.addEventListener('click', (e) => {
        finishOnboarding(e.target);
      });
    }

    // Abmelden
    // Spiele-Button asynchron einblenden, falls Spiele verfügbar sind
    API.anfrage('GET', '/games/verfuegbar').then(daten => {
      if (daten.spiele && daten.spiele.some(s => s.istVerfuegbar)) {
        document.getElementById('spiele-btn')?.classList.remove('versteckt');
      }
    }).catch(() => {});

    document.getElementById('abmelden-btn')?.addEventListener('click', () => {
      UI.ausloggen();
    });

    document.getElementById('schule-btn')?.addEventListener('click', () => {
      window.location.hash = '#schule';
    });

    document.getElementById('spiele-btn')?.addEventListener('click', () => {
      window.location.hash = '#spiele';
    });

    document.getElementById('admin-panel-btn')?.addEventListener('click', () => {
      window.location.hash = '#admin';
    });

    // 🥚 Easter Egg 2: Konfetti auf Logo
    let logoClicks = 0;
    let logoClickTimer;
    document.getElementById('header-logo')?.addEventListener('click', () => {
      logoClicks++;
      clearTimeout(logoClickTimer);
      if (logoClicks >= 7) {
        logoClicks = 0;
        if (!window.confetti) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
          script.onload = () => confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
          document.body.appendChild(script);
        } else {
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        }
      }
      logoClickTimer = setTimeout(() => logoClicks = 0, 1500);
    });

    document.getElementById('passwort-btn')?.addEventListener('click', () => {
      this.passwortAendernModal();
    });

    // Kombiniertes Formular - Zeichenzähler
    const kombiTextarea = document.getElementById('kombi-inhalt');
    const kombiZaehler = document.getElementById('kombi-zaehler');
    const kombiIcon = document.getElementById('kombi-icon');
    const kombiWarnung = document.getElementById('kombi-warnung');
    const kombiBtn = document.getElementById('kombi-btn');

    // 🥚 Easter Egg 3: Flüchtender Button
    const checkFleeMode = () => {
      const val = kombiTextarea.value.trim().toLowerCase();
      if (val === '/catchme') {
        if (!kombiBtn.dataset.fleeing) {
          kombiBtn.dataset.fleeing = 'true';
          
          const originParent = kombiBtn.parentNode;
          const originNextSibling = kombiBtn.nextSibling;
          document.body.appendChild(kombiBtn); // Aus dem DOM Flow nehmen, um Parent-Clip zu verhindern
          
          kombiBtn.style.position = 'fixed';
          kombiBtn.style.zIndex = '9999';
          kombiBtn.style.width = 'max-content';
          kombiBtn.style.margin = '0';
          kombiBtn.innerText = 'Catch me if you can! 🏃';
          
          const moveBtn = (e) => {
            if (e && e.cancelable) e.preventDefault(); // Klick/Touch abfangen
            const maxX = Math.max(0, window.innerWidth - kombiBtn.offsetWidth - 20);
            const maxY = Math.max(0, window.innerHeight - kombiBtn.offsetHeight - 20);
            const randX = Math.max(10, Math.floor(Math.random() * maxX));
            const randY = Math.max(10, Math.floor(Math.random() * maxY));
            kombiBtn.style.left = randX + 'px';
            kombiBtn.style.top = randY + 'px';
          };
          
          kombiBtn.addEventListener('mouseover', moveBtn);
          kombiBtn.addEventListener('touchstart', moveBtn, {passive: false});
          moveBtn();
          
          setTimeout(() => {
            kombiBtn.removeEventListener('mouseover', moveBtn);
            kombiBtn.removeEventListener('touchstart', moveBtn);
            kombiBtn.dataset.fleeing = '';
            kombiBtn.style.position = '';
            kombiBtn.style.zIndex = '';
            kombiBtn.style.left = '';
            kombiBtn.style.top = '';
            kombiBtn.style.width = '';
            kombiBtn.style.margin = '';
            kombiBtn.innerHTML = `${UI.icon('send')} Nachricht senden`;
            kombiTextarea.value = '';
            if (originNextSibling) {
              originParent.insertBefore(kombiBtn, originNextSibling);
            } else {
              originParent.appendChild(kombiBtn);
            }
          }, 10000);
        }
      }
    };
    kombiTextarea.addEventListener('input', checkFleeMode);
    const kombiKarte = document.getElementById('kombi-karte');
    
    if (kombiTextarea && kombiZaehler) {
      UI.zeichenZaehler(kombiTextarea, kombiZaehler, 5000);
    }

    // UI-Wechsel bei Auswahl der Art
    document.querySelectorAll('input[name="nachricht_typ"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const typ = e.target.value;
        // Immer zuerst alle Zustände zurücksetzen
        kombiKarte.classList.remove('notfall-karte', 'achtung-karte');

        if (typ === 'standard') {
          kombiIcon.innerHTML = UI.icon('send');
          kombiIcon.className = 'karte-icon karte-icon-primaer';
          kombiWarnung.classList.add('versteckt');
          kombiBtn.className = 'btn btn-primaer btn-gross';
          kombiBtn.innerHTML = `${UI.icon('send')} Nachricht senden`;
        } else if (typ === 'hoch') {
          kombiIcon.innerHTML = UI.icon('triangle-alert');
          kombiIcon.className = 'karte-icon karte-icon-warnung';
          kombiWarnung.className = 'info-box warnung';
          document.getElementById('kombi-warnung-text').textContent = 'Dein Agent schickt dir sofort eine Push-Mitteilung.';
          kombiBtn.className = 'btn btn-warnung btn-gross';
          kombiBtn.innerHTML = `${UI.icon('send')} Wichtig senden`;
          kombiKarte.classList.add('achtung-karte');
        } else if (typ === 'notfall') {
          kombiIcon.innerHTML = UI.icon('siren');
          kombiIcon.className = 'karte-icon karte-icon-notfall';
          kombiWarnung.className = 'info-box fehler';
          document.getElementById('kombi-warnung-text').textContent = 'Löst sofort einen Alarm aus, auch im Nicht-stören-Modus.';
          kombiBtn.className = 'btn btn-notfall btn-gross';
          kombiBtn.innerHTML = `${UI.icon('siren')} Notfall senden`;
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
      micBtn.innerHTML = UI.icon('mic');
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
        micBtn.innerHTML = UI.icon('square');

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
        // Aktiv gewähltes Poke-Profil ermitteln
        const aktiverProfilBtn = document.querySelector('.poke-profil-btn.aktiv');
        const pokeProfilId = aktiverProfilBtn ? parseInt(aktiverProfilBtn.dataset.profilId) : null;

        if (typ === 'standard') {
          await API.nachrichtSenden(inhalt, originalTranskript, pokeProfilId);
        } else {
          await API.notfallSenden(inhalt, typ, originalTranskript, pokeProfilId);
        }
        
        UI.erfolg('Nachricht erfolgreich an den Agenten gesendet! ✅');
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

    // KI-Agenten laden und Auswahl anzeigen
    try {
      const profile = await API.meinePokeProfile();
      if (profile && profile.length >= 2) {
        const pContainer = document.getElementById('poke-profil-auswahl');
        if (pContainer) {
          pContainer.classList.remove('versteckt');
          pContainer.innerHTML = profile.map((p, idx) => `
            <button type="button" class="btn btn-sekundaer btn-klein poke-profil-btn ${idx === 0 ? 'aktiv' : ''}"
                    data-profil-id="${p.id}" role="radio" aria-checked="${idx === 0}">
              <span class="agent-punkt" style="background: ${UI.escapeHtml(p.farbe || 'var(--signal)')};"></span>
              ${UI.escapeHtml(p.name)}
            </button>
          `).join('');

          pContainer.querySelectorAll('.poke-profil-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              pContainer.querySelectorAll('.poke-profil-btn').forEach(b => {
                b.classList.remove('aktiv');
                b.setAttribute('aria-checked', 'false');
              });
              e.currentTarget.classList.add('aktiv');
              e.currentTarget.setAttribute('aria-checked', 'true');
            });
          });
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Poke-Profile:', e);
    }

    // Verlauf laden
    await this.verlaufLaden();

    // Smart Polling (alle 10 Sekunden)
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(async () => {
      await this.verlaufStummAktualisieren();
    }, 10000);

    // Geplant-Senden Toggle
    document.getElementById('planen-btn')?.addEventListener('click', () => {
      const feld = document.getElementById('plan-datum-feld');
      feld.classList.toggle('versteckt');
      if (!feld.classList.contains('versteckt')) {
        // Standardwert: in 1 Stunde (in lokaler Zeit für das Input-Feld)
        const in1h = new Date(Date.now() + 60 * 60 * 1000);
        const tzOffset = in1h.getTimezoneOffset() * 60000;
        const localISOTime = new Date(in1h - tzOffset).toISOString().slice(0, 16);
        document.getElementById('plan-datum').value = localISOTime;
      }
    });
    document.getElementById('plan-abbrechen')?.addEventListener('click', () => {
      document.getElementById('plan-datum-feld').classList.add('versteckt');
    });
    document.getElementById('plan-senden')?.addEventListener('click', async () => {
      const inhalt = kombiTextarea.value.trim();
      const sendAt = document.getElementById('plan-datum').value;
      const typ = document.querySelector('input[name="nachricht_typ"]:checked').value;
      if (!inhalt) { UI.fehler('Bitte eine Nachricht eingeben.'); return; }
      if (!sendAt) { UI.fehler('Bitte einen Sendezeitpunkt wählen.'); return; }
      
      const localDate = new Date(sendAt);
      if (isNaN(localDate.getTime())) { UI.fehler('Ungültiges Datum.'); return; }
      const utcSendAt = localDate.toISOString(); // Konvertiere lokale Browserzeit in UTC-String für den Server

      const btn = document.getElementById('plan-senden');
      UI.btnLaden(btn, true);
      try {
        const aktiverProfilBtn = document.querySelector('.poke-profil-btn.aktiv');
        const pokeProfilId = aktiverProfilBtn ? parseInt(aktiverProfilBtn.dataset.profilId) : null;

        const prio = typ !== 'standard' ? typ : null;
        await API.nachrichtPlanen(inhalt, utcSendAt, prio, pokeProfilId);
        const sendeZeit = localDate.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        UI.erfolg(`Nachricht für ${sendeZeit} Uhr eingeplant! ⏰`);
        kombiTextarea.value = '';
        document.getElementById('plan-datum-feld').classList.add('versteckt');
        kombiTextarea.dispatchEvent(new Event('input'));
        await this.verlaufLaden();
      } catch (err) {
        UI.fehler(err.message);
      } finally {
        UI.btnLaden(btn, false);
      }
    });
  },

  setzeTemplate(text) {
    const textarea = document.getElementById('kombi-inhalt');
    if (!textarea) return;
    textarea.value = text;
    textarea.focus();
    textarea.dispatchEvent(new Event('input')); // Zeichenzähler aktualisieren
  },

  async sendeSpecial(specialType, hint, fallBackText, prioritaet) {
    if (!confirm(`Soll diese Special-Action (${specialType}) wirklich ausgelöst werden?`)) return;

    this.spieleSpecialEffekt(specialType);

    const inhalt = `[SPECIAL:${specialType}] ${fallBackText}\n\nHinweis für den Agenten: ${hint}`;
    
    UI.btnLaden(document.getElementById('kombi-btn'), true);
    try {
      await API.notfallSenden(inhalt, prioritaet, null);
      UI.erfolg('Special Action erfolgreich ausgelöst! 🚀');
      await this.verlaufLaden();
    } catch (err) {
      UI.fehler(err.message);
    } finally {
      UI.btnLaden(document.getElementById('kombi-btn'), false);
    }
  },

  spieleSpecialEffekt(specialType) {
    // 🎵 Sound abspielen (unabhängig von prefers-reduced-motion)
    const soundMap = {
      'DOORBELL': 'doorbell.mp3',
      'SOS': 'sos.mp3',
      'DEADLINE': 'deadline.mp3',
      'WAKEUP': 'wakeup.mp3',
      'WHERE_ARE_YOU': 'radar.mp3'
    };
    
    if (soundMap[specialType]) {
      const audio = new Audio(`/sounds/${soundMap[specialType]}`);
      audio.play().catch(e => console.log('Audio Autoplay blockiert:', e));
    }

    // Falls prefers-reduced-motion aktiv ist, machen wir nur ein kurzes Flackern oder nichts
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.style.transition = 'filter 0.2s';
      document.body.style.filter = 'brightness(1.2)';
      setTimeout(() => document.body.style.filter = '', 200);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = `effekt-overlay effekt-${specialType.toLowerCase()}`;
    
    // Für WAKEUP und SOS manipulieren wir zusätzlich den Body/App-Container kurz
    if (specialType === 'SOS') {
      document.body.classList.add('effekt-sos-body');
    } else if (specialType === 'WAKEUP') {
      document.querySelector('.app-container')?.classList.add('effekt-wakeup-blur');
    }

    document.body.appendChild(overlay);

    // Aufräumen nach 2.5 Sekunden
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      document.body.classList.remove('effekt-sos-body');
      document.querySelector('.app-container')?.classList.remove('effekt-wakeup-blur');
      
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 500);
    }, 2500);
  },

  async verlaufStummAktualisieren() {
    try {
      const nachrichten = await API.meineNachrichten();
      
      // Prüfen ob sich etwas geändert hat (rudimentärer Hash oder Längen-Check)
      const neuHash = JSON.stringify(nachrichten);
      if (this._letzterVerlaufHash !== neuHash) {
        this._letzterVerlaufHash = neuHash;
        this.rendereVerlauf(nachrichten);
      }
    } catch (err) {
      // Stumm ignorieren beim Polling
    }
  },

  async verlaufLaden() {
    const container = document.getElementById('verlauf-inhalt');
    if (!container) return;

    try {
      const nachrichten = await API.meineNachrichten();
      this._letzterVerlaufHash = JSON.stringify(nachrichten);
      this.rendereVerlauf(nachrichten);
    } catch (err) {
      container.innerHTML = `<div class="info-box fehler">${UI.icon('circle-alert')}<span>Verlauf konnte nicht geladen werden: ${UI.escapeHtml(err.message)}</span></div>`;
    }
  },

  rendereVerlauf(nachrichten) {
    const container = document.getElementById('verlauf-inhalt');
    if (!container) return;
    if (nachrichten.length === 0) {
      container.innerHTML = UI.leereListeHtml('inbox', 'Noch nichts gesendet. Deine erste Nachricht erscheint hier – zusammen mit der Antwort.');
      return;
    }

    const statusBadge = (n) => {
      if (n.statusLabel === 'erledigt') return `<span class="status-chip erledigt">${UI.icon('circle-check')} Erledigt</span>`;
      if (n.statusLabel === 'in_bearbeitung') return `<span class="status-chip bearbeitung">${UI.icon('loader-circle')} In Bearbeitung</span>`;
      return '';
    };

    const gepinntBadge = (n) => n.gepinnt
      ? `<span class="status-chip" title="Angeheftet">${UI.icon('pin')} Angeheftet</span>`
      : '';

    const geplanterStatus = (n) => {
      if (n.status === 'geplant' && n.geplantesSenden) {
        const t = new Date(n.geplantesSenden).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `<div class="verlauf-hinweis geplant">
          ${UI.icon('clock')} Wird am ${t} Uhr gesendet
          <button class="textarea-aktion-btn" onclick="DashboardView.nachrichtAbbrechen(${n.id})">Nicht senden</button>
        </div>`;
      }
      if (n.status === 'abgebrochen') return `<div class="verlauf-hinweis">${UI.icon('ban')} Nicht gesendet</div>`;
      return '';
    };

    const statusZeile = (n) => {
      if (n.status === 'gesendet') return `<span class="verlauf-status">${UI.icon('check')} Gesendet</span>`;
      if (n.status === 'geplant') return `<span class="verlauf-status geplant">${UI.icon('clock')} Geplant</span>`;
      if (n.status === 'abgebrochen') return `<span class="verlauf-status">${UI.icon('ban')} Abgebrochen</span>`;
      if (n.status === 'wird_gesendet') return `<span class="verlauf-status">${UI.icon('loader-circle')} Wird gesendet</span>`;
      return `<span class="verlauf-status fehlgeschlagen">${UI.icon('circle-x')} Nicht zugestellt</span>`;
    };

    const sortierteNachrichten = [...nachrichten].sort((a, b) => {
      if (a.gepinnt && !b.gepinnt) return -1;
      if (!a.gepinnt && b.gepinnt) return 1;
      return 0; // Behält die vorherige Reihenfolge (nach created_at) bei
    });

    container.innerHTML = `
      <div class="verlauf-liste">
        ${sortierteNachrichten.map(n => `
          <article class="verlauf-eintrag${n.gepinnt ? ' gepinnt' : ''}" id="eintrag-${n.id}">
            <div style="min-width: 0;">
              <div class="verlauf-meta">
                ${UI.typBadge(n.typ, n.prioritaet)}
                ${statusBadge(n)}
                ${gepinntBadge(n)}
              </div>
              ${UI.renderInhalt(n.inhalt)}
              ${n.statusLabelNotiz ? `<div class="verlauf-hinweis">${UI.icon('bot')} ${UI.escapeHtml(n.agentName || 'KI-Agent')}: ${UI.escapeHtml(n.statusLabelNotiz)}</div>` : ''}
              ${n.fehler ? `<div class="verlauf-hinweis fehler">${UI.icon('circle-alert')} ${UI.escapeHtml(n.fehler)}</div>` : ''}
              ${geplanterStatus(n)}
              ${UI.renderAntworten(n.id, n.antwortText, n.nutzerAntworten, n.agentName)}
              ${n.antwortText ? `
                <div class="verlauf-aktionen">
                  <button class="textarea-aktion-btn" onclick="DashboardView.antwortfeldToggle(${n.id})" id="antwort-toggle-${n.id}">
                    ${UI.icon('reply')} Antworten
                  </button>
                </div>
                <div id="antwortfeld-${n.id}" class="versteckt" style="margin-top: 8px; max-width: 72ch;">
                  <label class="nur-sr" for="antworttext-${n.id}">Deine Antwort</label>
                  <div class="textarea-wrapper">
                    <textarea class="formular-textarea" id="antworttext-${n.id}" placeholder="Deine Antwort an ${UI.escapeHtml(n.agentName || 'den Agenten')}" rows="3" maxlength="2000" style="min-height: 80px;"></textarea>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
                    <button class="btn btn-ghost btn-klein" onclick="DashboardView.antwortfeldToggle(${n.id})">Abbrechen</button>
                    <button class="btn btn-primaer btn-klein" id="antwort-senden-${n.id}" onclick="DashboardView.antwortSenden(${n.id})">${UI.icon('send')} Antwort senden</button>
                  </div>
                </div>
              ` : (n.status === 'gesendet' ? `<div class="warte-hinweis"><span class="warte-punkt"></span> ${UI.escapeHtml(n.agentName || 'Dein Agent')} hat noch nicht geantwortet</div>` : '')}
            </div>
            <div class="verlauf-seite">
              <time class="verlauf-datum" datetime="${UI.escapeHtml(n.gesendetAm || '')}">${UI.datumFormatieren(n.gesendetAm)}</time>
              ${statusZeile(n)}
              <button class="textarea-aktion-btn" onclick="DashboardView.pinnenToggle(${n.id})" aria-label="${n.gepinnt ? 'Nicht mehr anheften' : 'Anheften'}" title="${n.gepinnt ? 'Nicht mehr anheften' : 'Oben anheften'}">
                ${UI.icon(n.gepinnt ? 'pin-off' : 'pin')} ${n.gepinnt ? 'Lösen' : 'Anheften'}
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  },

  async nachrichtAbbrechen(id) {
    if (!confirm('Geplante Nachricht wirklich abbrechen?')) return;
    try {
      await API.nachrichtAbbrechen(id);
      UI.erfolg('Geplante Nachricht abgebrochen.');
      await this.verlaufLaden();
    } catch (err) {
      UI.fehler(err.message);
    }
  },

  async buttonKlick(btnElement, nachrichtId, btnId) {
    UI.btnLaden(btnElement, true);
    try {
      const result = await API.buttonKlicken(nachrichtId, btnId);
      UI.erfolg(result.nachricht || 'Klick erfolgreich gesendet!');
      await this.verlaufLaden();
    } catch (err) {
      UI.fehler(err.message);
      UI.btnLaden(btnElement, false);
    }
  },

  async pinnenToggle(id) {
    try {
      const result = await API.nachrichtPinnen(id);
      await this.verlaufLaden();
      UI.erfolg(result.gepinnt ? 'Nachricht angeheftet.' : 'Nachricht gelöst.');
    } catch (err) {
      UI.fehler(err.message);
    }
  },


  antwortfeldToggle(id) {
    const feld = document.getElementById(`antwortfeld-${id}`);
    const btn = document.getElementById(`antwort-toggle-${id}`);
    if (!feld) return;
    const offen = !feld.classList.contains('versteckt');
    feld.classList.toggle('versteckt', offen);
    if (!offen) {
      document.getElementById(`antworttext-${id}`)?.focus();
    }
  },

  async antwortSenden(id) {
    const textarea = document.getElementById(`antworttext-${id}`);
    const btn = document.getElementById(`antwort-senden-${id}`);
    const inhalt = textarea?.value.trim();
    if (!inhalt) return;

    UI.btnLaden(btn, true);
    try {
      await API.nachrichtAntworten(id, inhalt);
      UI.erfolg('Deine Antwort wurde an den Agenten gesendet! ↩️');
      await this.verlaufLaden();
    } catch (err) {
      UI.fehler(err.message);
      UI.btnLaden(btn, false);
    }
  },

  passwortAendernModal() {
    UI.modalZeigen(`
      <div class="modal-header">
        <span class="modal-titel">🔒 Passwort ändern</span>
        <button class="modal-schliessen" onclick="UI.modalSchliessen()" aria-label="Schließen">${UI.icon('x')}</button>
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
