// yRelay - Login-View
const LoginView = {
  rendern() {
    return `
      <div class="seite login-seite">
        <div class="karte login-karte">
          <div class="login-logo-bereich">
            <span class="login-logo">
              <span class="logo-y">y</span><span class="logo-relay">Relay</span>
            </span>
            <p class="login-slogan">Messaging-Portal für Poke</p>
          </div>

          <div class="karte-koerper">
            <form id="login-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="login-benutzername">Benutzername oder E-Mail</label>
                <input
                  class="formular-eingabe"
                  type="text"
                  id="login-benutzername"
                  name="benutzername"
                  placeholder="Benutzername oder E-Mail"
                  autocomplete="username"
                  required
                >
              </div>

              <div class="formular-gruppe">
                <label class="formular-label" for="login-passwort">Passwort</label>
                <input
                  class="formular-eingabe"
                  type="password"
                  id="login-passwort"
                  name="passwort"
                  placeholder="Dein Passwort"
                  autocomplete="current-password"
                  required
                >
              </div>

              <div id="login-fehler" class="info-box fehler versteckt" style="margin-bottom: 16px;">
                <span>⚠️</span>
                <span id="login-fehler-text"></span>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-bottom: 16px;">
                <a href="#" id="passwort-vergessen-link" class="text-link" style="font-size: 13px;">Passwort vergessen?</a>
              </div>

              <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="login-btn">
                Anmelden
              </button>
            </form>

            <p class="text-gedaempft text-zentriert" style="margin-top: 20px;">
              Noch kein Konto? Wende dich an den Administrator.
            </p>
          </div>
        </div>
      </div>

      <!-- Passwort Vergessen Modal -->
      <div id="reset-modal" class="modal-overlay versteckt">
        <div class="modal-box" style="max-width: 400px;">
          <div class="modal-header">
            <h2 class="modal-titel">Passwort zurücksetzen</h2>
            <button class="modal-schliessen" id="reset-schliessen"><i class="ph ph-x"></i></button>
          </div>
          <div class="modal-koerper">
            <p class="text-gedaempft" style="margin-bottom: 16px; font-size: 14px;">Bitte gib deine E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du dein Passwort sicher zurücksetzen kannst.</p>
            <form id="reset-formular">
              <div class="formular-gruppe">
                <input class="formular-eingabe" type="email" id="reset-email" placeholder="deine@email.de" required>
              </div>
              <div style="display:flex; justify-content:flex-end; gap: 12px; margin-top: 24px;">
                <button type="button" class="btn btn-sekundaer" id="reset-abbrechen">Abbrechen</button>
                <button type="submit" class="btn btn-primaer" id="reset-senden-btn">Senden</button>
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
