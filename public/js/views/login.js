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
  },
};
