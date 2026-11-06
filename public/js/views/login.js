// yRelay - Login-View
const LoginView = {
  rendern() {
    return `
      <div class="anmeldung">
        <section class="anmeldung-band" aria-hidden="false">
          <span class="wegweiser wegweiser-gross" aria-label="yRelay">yRelay</span>
          <div class="anmeldung-mitte">
            <div>
              <h1>Der direkte Draht zu Ruwen.</h1>
              <p>Nachrichten, Wichtiges und Notfälle – zugestellt über seinen Agenten. Du siehst jede Station, bis die Antwort da ist.</p>
            </div>
            <figure class="anmeldung-beispiel" aria-label="Beispiel einer Nachricht und ihres Verlaufs">
              <figcaption>Beispiel</figcaption>
              <p class="fahrt-text">Hast du Freitag ab 19 Uhr Zeit?</p>
              <ol class="linie">
                <li class="halt"><span class="halt-punkt"></span><span class="halt-zeit">14:46</span><div class="halt-inhalt"><div class="halt-name">An den Agenten übergeben</div></div></li>
                <li class="halt antwort"><span class="halt-punkt"></span><span class="halt-zeit">14:47</span><div class="halt-inhalt"><div class="halt-name">Agent</div><div class="halt-text">Freitag ist frei. Ich trage es als Vorschlag ein.</div></div></li>
                <li class="halt ziel erledigt"><span class="halt-punkt">${UI.icon('haken')}</span><span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">Erledigt</div></div></li>
              </ol>
            </figure>
          </div>
          <div class="anmeldung-stufen">
            <span style="background:#fff;color:var(--blau)">${UI.icon('nachricht')}Normal</span>
            <span style="background:var(--orange);color:#1c1e1f">${UI.icon('wichtig')}Wichtig</span>
            <span style="background:var(--rot);color:#fff">${UI.icon('notfall')}Notfall</span>
          </div>
        </section>

        <section class="anmeldung-formular">
          <div class="innen">
            <h2>Anmelden</h2>
            <p class="unterzeile">Mit dem Zugang aus deiner Einladung.</p>
            <form id="login-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="login-benutzername">Benutzername oder E-Mail</label>
                <input class="formular-eingabe" type="text" id="login-benutzername" name="benutzername" autocomplete="username" required>
              </div>
              <div class="formular-gruppe">
                <label class="formular-label" for="login-passwort">Passwort</label>
                <input class="formular-eingabe" type="password" id="login-passwort" name="passwort" autocomplete="current-password" required>
              </div>
              <div class="zeile">
                <span></span>
                <a href="#" id="passwort-vergessen-link" class="text-link" style="font-size:15px;">Passwort vergessen?</a>
              </div>
              <div id="login-fehler" class="info-box fehler versteckt" role="alert">
                ${UI.icon('fehler')}<span id="login-fehler-text"></span>
              </div>
              <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="login-btn">Anmelden</button>
            </form>
            <p class="fusszeile">Noch kein Zugang? Den bekommst du nur per Einladung von Ruwen.</p>
          </div>
        </section>
      </div>

      <div id="reset-modal" class="modal-overlay versteckt">
        <div class="modal-box" style="max-width: 440px;" role="dialog" aria-modal="true" aria-labelledby="reset-titel">
          <div class="modal-header">
            <h2 class="modal-titel" id="reset-titel">Passwort zurücksetzen</h2>
            <button class="modal-schliessen" id="reset-schliessen" aria-label="Schließen">${UI.icon('x')}</button>
          </div>
          <div class="modal-koerper">
            <p class="text-gedaempft" style="margin-bottom: 16px;">Gib deine E-Mail-Adresse ein. Du bekommst einen Link, mit dem du ein neues Passwort festlegst.</p>
            <form id="reset-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="reset-email">E-Mail</label>
                <input class="formular-eingabe" type="email" id="reset-email" autocomplete="email" required>
              </div>
              <div class="modal-fuss">
                <button type="button" class="btn btn-ghost" id="reset-abbrechen">Abbrechen</button>
                <button type="submit" class="btn btn-primaer" id="reset-senden-btn">Link senden</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  initialisieren() {
    const formular = document.getElementById('login-formular');
    const btn = document.getElementById('login-btn');
    const fehlerBox = document.getElementById('login-fehler');
    const fehlerText = document.getElementById('login-fehler-text');

    if (!formular) return;

    formular.addEventListener('submit', async (e) => {
      e.preventDefault();
      fehlerBox.classList.add('versteckt');

      const benutzername = document.getElementById('login-benutzername').value.trim();
      const passwort = document.getElementById('login-passwort').value;

      if (!benutzername || !passwort) return;

      UI.btnLaden(btn, true);

      try {
        const ergebnis = await API.login(benutzername, passwort);
        API.setToken(ergebnis.token);
        App.nutzer = ergebnis.nutzer;
        App.navigieren(ergebnis.nutzer.rolle === 'admin' ? 'admin' : 'dashboard');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
        document.getElementById('login-passwort').value = '';
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    // Autofokus
    setTimeout(() => {
      const feld = document.getElementById('login-benutzername');
      if (feld) feld.focus();
    }, 50);

    // Modal-Logik
    const vergessenLink = document.getElementById('passwort-vergessen-link');
    const resetModal = document.getElementById('reset-modal');
    const resetSchliessen = document.getElementById('reset-schliessen');
    const resetAbbrechen = document.getElementById('reset-abbrechen');
    const resetFormular = document.getElementById('reset-formular');
    const resetSendenBtn = document.getElementById('reset-senden-btn');

    if (vergessenLink && resetModal) {
      const schliessen = () => resetModal.classList.add('versteckt');
      
      vergessenLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetModal.classList.remove('versteckt');
        setTimeout(() => document.getElementById('reset-email')?.focus(), 100);
      });

      resetSchliessen.addEventListener('click', schliessen);
      resetAbbrechen.addEventListener('click', schliessen);

      resetFormular.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!email) return;

        UI.btnLaden(resetSendenBtn, true);
        try {
          const antwort = await API.passwortVergessen(email);
          UI.erfolg(antwort.nachricht);
          schliessen();
        } catch (err) {
          UI.fehler(err.message);
        } finally {
          UI.btnLaden(resetSendenBtn, false);
        }
      });
    }
  },
};
