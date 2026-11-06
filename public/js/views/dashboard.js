// yRelay - Dashboard-View (Nutzeransicht)
const DashboardView = {
  rendern(nutzer) {
    const ic = (n, k) => UI.icon(n, k);
    const schritt = (aktiv) => `<div class="onboarding-fortschritt" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= aktiv ? 'an' : ''}"></i>`).join('')}</div>`;

    const onboardingHtml = !nutzer.has_seen_onboarding ? `
      <div id="onboarding-overlay" class="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Einführung">
        <div class="onboarding-slide aktiv" id="obs-1">
          ${schritt(1)}
          <div class="onboarding-icon">${ic('hand')}</div>
          <h2 class="onboarding-titel">Dein direkter Draht zu Ruwen</h2>
          <div class="onboarding-text">
            Willkommen in deiner persönlichen Einsatzzentrale. Das hier ist nicht einfach nur ein weiteres Chat-Programm – es ist eine absolute Garantie, dass du Ruwen erreichst, egal was passiert.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-primaer btn-gross obs-next">Weiter ${ic('weiter')}</button>
          </div>
        </div>

        <div class="onboarding-slide" id="obs-2">
          ${schritt(2)}
          <div class="onboarding-icon">${ic('anruf')}</div>
          <h2 class="onboarding-titel">Besser als ein Anruf</h2>
          <div class="onboarding-text">
            Wenn das Telefon klingelt, kann man es überhören. Das hier nicht.<br><br>
            Wenn du hier eine Notfall-Nachricht schickst, passiert Magie im Hintergrund. Das System ist direkt mit Ruwens Wohnung verbunden. Es kann laute Alarme auf seinem Handy auslösen, smarte Beleuchtung einschalten oder den "Nicht stören"-Modus durchbrechen, um ihn sofort aufzuwecken.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-ghost btn-gross obs-prev">Zurück</button>
            <button class="btn btn-primaer btn-gross obs-next">Verstanden ${ic('weiter')}</button>
          </div>
        </div>

        <div class="onboarding-slide" id="obs-3">
          ${schritt(3)}
          <div class="onboarding-icon">${ic('kalender')}</div>
          <h2 class="onboarding-titel">Nicht nur für brennende Häuser!</h2>
          <div class="onboarding-text">
            Du musst nicht warten, bis die Welt untergeht. Das System hilft Ruwen auch, seinen Alltag zu organisieren. Du kannst hier jederzeit ganz normale Dinge schreiben, wie zum Beispiel:
            <ul>
              <li><em>„Hast du am Freitag Zeit für ein Bier?“</em> (Das System prüft seinen Kalender und trägt es ein!)</li>
              <li><em>„Setze bitte Milch auf deine Einkaufsliste.“</em></li>
              <li><em>„Bitte ruf mich morgen um 10 Uhr an.“</em></li>
            </ul>
            Trau dich ruhig, es auszuprobieren! Einmal alle paar Wochen ist völlig okay.
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-ghost btn-gross obs-prev">Zurück</button>
            <button class="btn btn-primaer btn-gross obs-next">Klingt gut ${ic('weiter')}</button>
          </div>
        </div>

        <div class="onboarding-slide" id="obs-4">
          ${schritt(4)}
          <div class="onboarding-icon rot">${ic('notfall')}</div>
          <h2 class="onboarding-titel">Dein erster Test-Alarm</h2>
          <div class="onboarding-text">
            Graue Theorie ist langweilig. Lass uns direkt ausprobieren, wie das funktioniert. Drücke auf den roten Knopf unten, um eine "Hallo Welt"-Testnachricht an Ruwen zu schicken.<br><br>
            Keine Sorge, für Testnachrichten geht kein ohrenbetäubender Alarm los – er bekommt nur freundlich Bescheid!
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-ghost" id="obs-skip-btn">Überspringen</button>
            <button class="btn btn-notfall btn-gross" id="obs-test-btn">${ic('senden')} Trockenübung starten</button>
          </div>
        </div>
      </div>
    ` : '';

    const vorlage = (icon, text, vorlageText) => `<button type="button" class="btn-template" onclick="DashboardView.setzeTemplate('${vorlageText}')">${ic(icon)}${text}</button>`;
    const alarm = (typ, icon, name, hinweis, fallback, prio) => `
      <button type="button" class="btn-special ${prio === 'hoch' ? 'hoch' : ''}" onclick="DashboardView.sendeSpecial('${typ}', '${hinweis}', '${fallback}', '${prio}')">
        <span class="zeichen">${ic(icon)}</span>${name}
      </button>`;

    return `
      ${onboardingHtml}
      <div class="seite app-container" ${!nutzer.has_seen_onboarding ? 'id="haupt-wrapper" style="pointer-events:none"' : ''}>
        ${UI.kopf(nutzer, 'dashboard')}

        <main class="inhalt">
          <div class="postfach">
            <div class="postfach-links">
              <section class="tafel verfasser" id="kombi-karte" data-stufe="standard" aria-labelledby="verfasser-titel">
                <div class="verfasser-kopf">
                  <h1 id="verfasser-titel">Nachricht an Ruwen</h1>
                  <p id="zustell-hinweis">Wird über seinen Agenten zugestellt und beantwortet.</p>
                </div>
                <form id="kombi-formular">
                  <div id="poke-profil-auswahl" class="agenten-wahl" style="display:none;"></div>

                  <fieldset>
                    <legend>Dringlichkeit</legend>
                    <div class="stufen-wahl">
                      <input type="radio" id="typ-standard" name="nachricht_typ" value="standard" checked>
                      <label for="typ-standard" class="s-standard">${ic('nachricht')}<b>Normal</b><small>Wird zugestellt, ohne zu stören</small></label>
                      <input type="radio" id="typ-hoch" name="nachricht_typ" value="hoch">
                      <label for="typ-hoch" class="s-hoch">${ic('wichtig')}<b>Wichtig</b><small>Push aufs Handy, kein Alarm</small></label>
                      <input type="radio" id="typ-notfall" name="nachricht_typ" value="notfall">
                      <label for="typ-notfall" class="s-notfall">${ic('notfall')}<b>Notfall</b><small>Alarm, sofort, auch nachts</small></label>
                    </div>
                  </fieldset>

                  <div id="kombi-warnung" class="warnzeile versteckt">
                    ${ic('wichtig')}<span id="kombi-warnung-text">Dein Agent leitet diese Nachricht mit höchster Dringlichkeit weiter.</span>
                  </div>

                  <label class="formular-label" for="kombi-inhalt">Deine Nachricht</label>
                  <div class="schreibfeld textarea-wrapper">
                    <textarea id="kombi-inhalt" placeholder="Was soll Ruwen wissen?" rows="5" maxlength="5000" required></textarea>
                    <div class="schreibfeld-leiste textarea-aktionen">
                      <button type="button" id="mic-btn" class="mic-btn" title="Spracheingabe starten" aria-label="Spracheingabe starten">${ic('mikrofon')}</button>
                      <span id="mic-status" class="mic-status versteckt"><span id="mic-timer">00:00</span>&nbsp;/ 30:00</span>
                      <button type="button" id="retranscribe-btn" class="textarea-aktion-btn versteckt" title="Letzte Aufnahme erneut transkribieren">${ic('nochmal')}Nochmal</button>
                      <button type="button" id="clear-btn" class="textarea-aktion-btn" title="Textfeld leeren">Leeren</button>
                      <span class="zeichen-zaehler" id="kombi-zaehler">0 / 5000</span>
                    </div>
                  </div>

                  <div class="vorlagen templates-container" aria-label="Vorlagen">
                    <span class="vorlagen-titel">Vorlagen</span>
                    ${vorlage('kalender', 'Hat er Zeit?', 'Kannst du prüfen, ob Ruwen am [Datum] um [Uhrzeit] Zeit hat für [Grund]? Falls ja, trage es bitte direkt als Vorschlag ein.')}
                    ${vorlage('liste', 'Auf die Liste', 'Bitte setze [Artikel/To-Do] sofort auf Ruwens Einkaufsliste/To-Do-Liste.')}
                    ${vorlage('anruf', 'Rückruf', 'Ich komme nicht durch. Bitte priorisiere diesen Rückruf: Ich bin unter [Nummer] erreichbar wegen [Grund].')}
                    ${vorlage('erinnerung', 'Erinnern', 'Bitte erinnere Ruwen in [Zeitraum] dringend an: [Thema].')}
                  </div>

                  <div class="senden-zeile">
                    <button type="submit" class="btn btn-stufe btn-gross" id="kombi-btn">${ic('senden')}<span id="kombi-btn-text">Senden</span></button>
                    <button type="button" class="btn btn-sekundaer btn-gross btn-icon" id="planen-btn" title="Später senden" aria-label="Später senden">${ic('uhr')}</button>
                  </div>
                  <div id="plan-datum-feld" class="plan-feld versteckt">
                    <label class="formular-label" for="plan-datum">Senden am</label>
                    <input class="formular-eingabe" type="datetime-local" id="plan-datum">
                    <div class="knoepfe">
                      <button type="button" class="btn btn-ghost btn-klein" id="plan-abbrechen">Abbrechen</button>
                      <button type="button" class="btn btn-primaer btn-klein" id="plan-senden">Einplanen</button>
                    </div>
                  </div>
                </form>
              </section>

              <section class="tafel alarmtafel" aria-labelledby="alarm-titel">
                <div class="tafel-kopf"><h2 id="alarm-titel">Sofort-Alarm</h2><span>Ein Tipp, sofort raus</span></div>
                <div class="alarm-reihe special-actions-grid">
                  ${alarm('DOORBELL', 'tuer', 'Tür klingelt', 'Jemand steht an der Tür! Breche durch den DND-Modus, schalte Smart-Home-Lichter ein oder pinge Ruwen laut an.', 'Mach die Tür auf! Stehe unten.', 'notfall')}
                  ${alarm('SOS', 'notfall', 'SOS', 'ABSOLUTER NOTFALL. Ignoriere alle Regeln, nutze jeden Kanal (Anruf, lauter Alarm), um Ruwen sofort zu wecken/erreichen.', 'Code Red! Echter Notfall.', 'notfall')}
                  ${alarm('WAKEUP', 'wecker', 'Wecker', 'Spiel laute Musik ab oder mach das Licht im Schlafzimmer an, Ruwen verschläft oder muss aufwachen!', 'Aufwachen! Wecker!', 'notfall')}
                  ${alarm('DEADLINE', 'deadline', 'Deadline', 'Eine sehr zeitkritische Sache steht an. Pushe diese Info hart an Ruwen und tracke, ob er reagiert.', 'Wichtige Deadline / Time-Drop!', 'hoch')}
                  ${alarm('WHERE_ARE_YOU', 'standort', 'Wo bist du?', 'Jemand sucht Ruwen. Prüfe Ruwens Standort (falls verfügbar) und teile eine grobe ETA mit oder frag ihn, wann er ankommt.', 'Wo bist du? ETA gesucht.', 'hoch')}
                </div>
              </section>
            </div>

            <section class="verlauf" aria-labelledby="verlauf-titel">
              <div class="verlauf-kopf"><h2 id="verlauf-titel">Verlauf</h2><span id="verlauf-anzahl"></span></div>
              <div id="verlauf-inhalt"><div class="lade-spinner"></div></div>
            </section>
          </div>
        </main>
      </div>
    `;
  },

  profilModal(nutzer) {
    UI.modalZeigen(`
      ${UI.modalKopf('Profil und Benachrichtigungen')}
      <div class="modal-koerper">
        <form id="profil-formular">
          <div class="formular-gruppe">
            <label class="formular-label" for="profil-anzeigename">Anzeigename</label>
            <input class="formular-eingabe" type="text" id="profil-anzeigename" value="${UI.escapeHtml(nutzer.anzeigename || '')}" placeholder="So sehen dich andere">
          </div>
          <p class="formular-label" style="margin-top:22px">Wie du von Antworten erfährst</p>
          <div class="formular-gruppe">
            <label class="checkbox-label"><input type="checkbox" id="profil-email-notifications" ${nutzer.email_notifications !== false ? 'checked' : ''}> E-Mail</label>
            <div class="formular-hilfe" style="margin-left:28px">Passwort-Links und Einladungen kommen immer per E-Mail.</div>
          </div>
          <div class="formular-gruppe">
            <label class="checkbox-label"><input type="checkbox" id="profil-ntfy-enabled" ${nutzer.ntfy_topic ? 'checked' : ''}> ntfy</label>
            <div style="display:flex; gap:8px; margin:8px 0 0 28px;">
              <input class="formular-eingabe" type="text" id="profil-ntfy" value="${UI.escapeHtml(nutzer.ntfy_topic || '')}" placeholder="z. B. yrelay-lena-abc123" maxlength="32" pattern="[A-Za-z0-9_-]+" aria-label="ntfy-Topic" style="flex:1;">
              <button type="button" class="btn btn-sekundaer" id="ntfy-generieren" title="Zufälliges Topic erzeugen">${UI.icon('wuerfel')}Erzeugen</button>
            </div>
            <div class="formular-hilfe" style="margin-left:28px">Abonniere das Topic in der <a href="https://ntfy.sh" target="_blank" rel="noopener">ntfy-App</a> und gib es nicht weiter.</div>
          </div>
          <div class="formular-gruppe">
            <label class="checkbox-label"><input type="checkbox" id="profil-pushover-enabled" ${nutzer.pushover_configured ? 'checked' : ''}> Pushover</label>
            <input class="formular-eingabe" type="password" id="profil-pushover-key" autocomplete="new-password" aria-label="Pushover User-Key" placeholder="${nutzer.pushover_configured ? 'Gespeicherter Key bleibt unverändert' : 'Pushover User-Key'}" style="margin:8px 0 0 28px; width:calc(100% - 28px);">
          </div>
          <div class="modal-fuss">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" id="profil-speichern">Speichern</button>
          </div>
        </form>
      </div>
    `);

    document.getElementById('ntfy-generieren')?.addEventListener('click', () => {
      const generateSafeString = () => {
        if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };
      const name = nutzer.benutzername.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'nutzer';
      document.getElementById('profil-ntfy').value = `yrelay-${name}-${generateSafeString().slice(0, 14)}`;
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
        UI.erfolg('Profil gespeichert. Lade neu …');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(btn, false);
      }
    });
  },

  async initialisieren(nutzer) {
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
                        document.getElementById('haupt-wrapper').style.pointerEvents = '';
          }, 500);
        } catch(err) {
          UI.fehler(err.message);
          UI.btnLaden(btn, false);
        }
      };

      document.getElementById('obs-test-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
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
        finishOnboarding(e.currentTarget);
      });
    }

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
    const kombiKarte = document.getElementById('kombi-karte');
    const kombiZaehler = document.getElementById('kombi-zaehler');
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
            kombiBtn.innerHTML = UI.icon('senden') + '<span id="kombi-btn-text">Senden</span>';
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
    
    if (kombiTextarea && kombiZaehler) {
      UI.zeichenZaehler(kombiTextarea, kombiZaehler, 5000);
    }

    // Stufenwechsel: die ganze Verfasser-Tafel nimmt die Farbe der Stufe an
    const stufenText = {
      standard: { knopf: 'Senden', hinweis: 'Wird über seinen Agenten zugestellt und beantwortet.' },
      hoch: { knopf: 'Wichtig senden', hinweis: 'Kommt als Push-Benachrichtigung, ohne Alarm.', warnung: 'Ruwen bekommt eine Push-Benachrichtigung, auch wenn er gerade beschäftigt ist.' },
      notfall: { knopf: 'Notfall melden', hinweis: 'Löst Alarm aus und durchbricht „Nicht stören“.', warnung: 'Nur für echte Notfälle: Das löst laute Alarme aus, auch nachts.' },
    };
    document.querySelectorAll('input[name="nachricht_typ"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const typ = e.target.value;
        const t = stufenText[typ] || stufenText.standard;
        kombiKarte.dataset.stufe = typ;
        document.getElementById('kombi-btn-text').textContent = t.knopf;
        document.getElementById('zustell-hinweis').textContent = t.hinweis;
        kombiWarnung.classList.toggle('versteckt', !t.warnung);
        if (t.warnung) document.getElementById('kombi-warnung-text').textContent = t.warnung;
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
      micBtn.innerHTML = UI.icon('mikrofon'); micBtn.setAttribute('aria-label', 'Spracheingabe starten');
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
        micBtn.innerHTML = UI.icon('stopp'); micBtn.setAttribute('aria-label', 'Aufnahme beenden');

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
        
        UI.erfolg('Nachricht ist unterwegs.');
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
          pContainer.style.display = 'flex';
          pContainer.innerHTML = profile.map((p, idx) => `
            <button type="button" class="btn btn-sekundaer btn-klein poke-profil-btn ${idx === 0 ? 'aktiv' : ''}" data-profil-id="${p.id}" aria-pressed="${idx === 0}">
              ${UI.icon('agent')}${UI.escapeHtml(p.name)}
            </button>
          `).join('');
          const hinweis = () => {
            const aktiv = pContainer.querySelector('.poke-profil-btn.aktiv');
            const p = profile.find(pr => aktiv && pr.id == aktiv.dataset.profilId);
            if (p && kombiKarte.dataset.stufe === 'standard') document.getElementById('zustell-hinweis').textContent = `Wird über ${p.name} zugestellt und beantwortet.`;
          };
          pContainer.querySelectorAll('.poke-profil-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              pContainer.querySelectorAll('.poke-profil-btn').forEach(b => { b.classList.remove('aktiv'); b.setAttribute('aria-pressed', 'false'); });
              e.currentTarget.classList.add('aktiv');
              e.currentTarget.setAttribute('aria-pressed', 'true');
              hinweis();
            });
          });
          hinweis();
        }
      } else if (profile && profile.length === 1) {
        document.getElementById('zustell-hinweis').textContent = `Wird über ${profile[0].name} zugestellt und beantwortet.`;
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
        UI.erfolg(`Eingeplant für ${sendeZeit} Uhr.`);
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
    if (!confirm(`„${(UI._sonder[specialType] || {}).name || specialType}“ jetzt auslösen? Ruwen wird sofort alarmiert.`)) return;

    this.spieleSpecialEffekt(specialType);

    const inhalt = `[SPECIAL:${specialType}] ${fallBackText}\n\nHinweis für den Agenten: ${hint}`;
    
    UI.btnLaden(document.getElementById('kombi-btn'), true);
    try {
      await API.notfallSenden(inhalt, prioritaet, null);
      UI.erfolg('Alarm ist raus.');
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

    const s = UI._sonder[specialType] || { icon: 'notfall', name: specialType };
    const stufe = (specialType === 'DEADLINE' || specialType === 'WHERE_ARE_YOU') ? 'hoch' : 'notfall';
    const overlay = document.createElement('div');
    overlay.className = `effekt-overlay effekt-${specialType.toLowerCase()}`;
    overlay.dataset.stufe = stufe;
    overlay.innerHTML = `<div class="effekt-schild">${UI.icon(s.icon)}<span>${UI.escapeHtml(s.name)}</span></div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2500);
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
      container.innerHTML = `<div class="info-box fehler">${UI.icon('fehler')}<span>Verlauf konnte nicht geladen werden: ${UI.escapeHtml(err.message)}</span></div>`;
    }
  },

  rendereVerlauf(nachrichten) {
    const container = document.getElementById('verlauf-inhalt');
    if (!container) return;
    const anzahl = document.getElementById('verlauf-anzahl');
    if (anzahl) anzahl.textContent = nachrichten.length ? `${nachrichten.length} Nachricht${nachrichten.length === 1 ? '' : 'en'}` : '';
    if (nachrichten.length === 0) {
      container.innerHTML = UI.leereListeHtml('nachricht', 'Was du schickst, erscheint hier – mit jeder Antwort auf dem Weg.', 'Noch nichts gesendet');
      return;
    }

    const angeheftet = nachrichten.filter(n => n.gepinnt);
    const rest = nachrichten.filter(n => !n.gepinnt);
    const gruppen = [];
    if (angeheftet.length) gruppen.push({ titel: 'Angeheftet', liste: angeheftet });
    for (const n of rest) {
      const titel = UI.tagName(n.gesendetAm) || 'Früher';
      const letzte = gruppen[gruppen.length - 1];
      if (letzte && letzte.titel === titel && letzte !== gruppen.find(g => g.titel === 'Angeheftet')) letzte.liste.push(n);
      else gruppen.push({ titel, liste: [n] });
    }

    const fahrt = (n) => {
      const stufe = UI.stufeVon(n.typ, n.prioritaet);
      const kann = n.antwortText && n.status === 'gesendet';
      return `
        <article class="fahrt stufe-${stufe}${n.gepinnt ? ' gepinnt' : ''}" id="eintrag-${n.id}">
          ${(() => {
            const pl = [
              n.gepinnt ? `<span class="pin-marke" title="Angeheftet">${UI.icon('pin')}</span>` : '',
              UI.typBadge(n.typ, n.prioritaet),
              n.statusLabel === 'erledigt' ? `<span class="plakette plakette-gruen">${UI.icon('haken')}Erledigt</span>` : '',
              n.statusLabel === 'in_bearbeitung' ? `<span class="plakette plakette-gelb">In Bearbeitung</span>` : '',
              n.status === 'geplant' ? `<span class="plakette">${UI.icon('uhr')}Geplant</span>` : '',
            ].join('');
            return pl ? `<div class="fahrt-kopf">${pl}</div>` : '';
          })()}
          <button class="btn btn-ghost btn-klein btn-icon fahrt-pin" onclick="DashboardView.pinnenToggle(${n.id})" title="${n.gepinnt ? 'Nicht mehr anheften' : 'Anheften'}" aria-label="${n.gepinnt ? 'Nicht mehr anheften' : 'Anheften'}">${UI.icon(n.gepinnt ? 'pinlos' : 'pin')}</button>
          ${UI.renderInhalt(n.inhalt)}
          ${UI.linieHtml(n)}
          ${kann ? `
            <div class="fahrt-antwort">
              <button class="btn btn-sekundaer btn-klein" onclick="DashboardView.antwortfeldToggle(${n.id})" id="antwort-toggle-${n.id}">${UI.icon('antworten')}Antworten</button>
              <div id="antwortfeld-${n.id}" class="antwort-form versteckt">
                <label class="sr-only" for="antworttext-${n.id}">Deine Antwort</label>
                <textarea class="formular-textarea" id="antworttext-${n.id}" placeholder="Antwort an ${UI.escapeHtml(n.agentName || 'den Agenten')} …" rows="3" maxlength="2000"></textarea>
                <div class="knoepfe">
                  <button class="btn btn-ghost btn-klein" onclick="DashboardView.antwortfeldToggle(${n.id})">Abbrechen</button>
                  <button class="btn btn-primaer btn-klein" id="antwort-senden-${n.id}" onclick="DashboardView.antwortSenden(${n.id})">${UI.icon('senden')}Senden</button>
                </div>
              </div>
            </div>` : ''}
        </article>`;
    };

    container.innerHTML = gruppen.map(g => `
      <h3 class="tag-trenner">${UI.escapeHtml(g.titel)}</h3>
      <div class="fahrten verlauf-liste">${g.liste.map(fahrt).join('')}</div>
    `).join('');
  },

  async nachrichtAbbrechen(id) {
    if (!confirm('Diese geplante Nachricht nicht senden?')) return;
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
      UI.erfolg(result.gepinnt ? 'Angeheftet.' : 'Nicht mehr angeheftet.');
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
    btn?.classList.toggle('versteckt', !offen);
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
      UI.erfolg('Antwort ist unterwegs.');
      await this.verlaufLaden();
    } catch (err) {
      UI.fehler(err.message);
      UI.btnLaden(btn, false);
    }
  },

  passwortAendernModal() {
    UI.modalZeigen(`
      ${UI.modalKopf('Passwort ändern')}
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
          <div id="pw-fehler" class="info-box fehler versteckt">${UI.icon('fehler')}<span id="pw-fehler-text"></span></div>
          <div class="modal-fuss">
            <button type="button" class="btn btn-ghost" onclick="UI.modalSchliessen()">Abbrechen</button>
            <button type="submit" class="btn btn-primaer" id="pw-speichern-btn">Passwort ändern</button>
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
