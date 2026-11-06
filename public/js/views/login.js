// yRelay - Login-View
const LoginView = {
  rendern() {
    return `
      <div class="seite login-seite">
        <div class="karte login-karte">
          <div class="login-logo-bereich">
            <div class="marke login-logo">${UI.marke()}</div>
            <h1 class="login-titel">Anmelden</h1>
            <p class="login-slogan">Schreib deinem KI-Agenten – im Alltag und im Notfall.</p>
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
                  autocomplete="current-password"
                  required
                >
              </div>

              <div id="login-fehler" class="info-box fehler versteckt" style="margin-bottom: 16px;">
                ${UI.icon('circle-alert')}
                <span id="login-fehler-text"></span>
              </div>

              <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="login-btn">
                Anmelden
              </button>
            </form>

            <p class="text-zentriert" style="margin-top: 16px; font-size: var(--t-klein);">
              <a href="#" id="passwort-vergessen-link">Passwort vergessen?</a>
            </p>
          </div>
          <div class="login-fuss">Noch kein Konto? Du bekommst eine Einladung von der Person, die yRelay betreibt.</div>
        </div>
      </div>

      <!-- Passwort Vergessen Modal -->
      <div id="reset-modal" class="modal-overlay versteckt">
        <div class="modal-box" style="max-width: 400px;">
          <div class="modal-header">
            <h2 class="modal-titel">Passwort zurücksetzen</h2>
            <button class="modal-schliessen" id="reset-schliessen">${UI.icon('x')}</button>
          </div>
          <div class="modal-koerper">
            <p class="text-gedaempft" style="margin-bottom: 16px;">Gib die E-Mail-Adresse deines Kontos ein. Du bekommst einen Link, mit dem du ein neues Passwort festlegst.</p>
            <form id="reset-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="reset-email">E-Mail-Adresse</label>
                <input class="formular-eingabe" type="email" id="reset-email" autocomplete="email" required>
              </div>
              <div style="display:flex; justify-content:flex-end; gap: 12px; margin-top: 24px;">
                <button type="button" class="btn btn-sekundaer" id="reset-abbrechen">Abbrechen</button>
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
