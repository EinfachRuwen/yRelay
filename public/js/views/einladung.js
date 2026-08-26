// yRelay - Einladungs-View
const EinladungView = {
  token: null,

  rendern(token) {
    this.token = token;
    return `
      <div class="seite login-seite">
        <div class="karte login-karte">
          <div class="login-logo-bereich">
            <span class="login-logo">
              <span class="logo-y">y</span><span class="logo-relay">Relay</span>
            </span>
            <p class="login-slogan">Konto aktivieren</p>
          </div>

          <div class="karte-koerper">
            <div class="info-box info" style="margin-bottom: 20px;">
              <span>👋</span>
              <span>Du wurdest zu yRelay eingeladen! Lege jetzt ein Passwort fest, um dein Konto zu aktivieren.</span>
            </div>

            <form id="einladung-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="einl-passwort">Passwort wählen</label>
                <input
                  class="formular-eingabe"
                  type="password"
                  id="einl-passwort"
                  placeholder="Mindestens 8 Zeichen"
                  autocomplete="new-password"
                  required
                  minlength="8"
                >
              </div>

              <div class="formular-gruppe">
                <label class="formular-label" for="einl-passwort2">Passwort bestätigen</label>
                <input
                  class="formular-eingabe"
                  type="password"
                  id="einl-passwort2"
                  placeholder="Passwort wiederholen"
                  autocomplete="new-password"
                  required
                >
              </div>

              <div id="einl-fehler" class="info-box fehler versteckt" style="margin-bottom: 16px;">
                <span>⚠️</span>
                <span id="einl-fehler-text"></span>
              </div>

              <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="einl-btn">
                Konto aktivieren →
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  initialisieren() {
    const formular = document.getElementById('einladung-formular');
    const btn = document.getElementById('einl-btn');
    const fehlerBox = document.getElementById('einl-fehler');
    const fehlerText = document.getElementById('einl-fehler-text');

    if (!formular) return;

    formular.addEventListener('submit', async (e) => {
      e.preventDefault();
      fehlerBox.classList.add('versteckt');

      const passwort = document.getElementById('einl-passwort').value;
      const passwort2 = document.getElementById('einl-passwort2').value;

      if (passwort.length < 8) {
        fehlerText.textContent = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
        fehlerBox.classList.remove('versteckt');
        return;
      }

      if (passwort !== passwort2) {
        fehlerText.textContent = 'Die Passwörter stimmen nicht überein.';
        fehlerBox.classList.remove('versteckt');
        return;
      }

      UI.btnLaden(btn, true);

      try {
        const ergebnis = await API.einladungAnnehmen(this.token, passwort);
        API.setToken(ergebnis.token);
        App.nutzer = ergebnis.nutzer;
        UI.erfolg('Willkommen bei yRelay! Dein Konto ist aktiviert.');
        App.navigieren(ergebnis.nutzer.rolle === 'admin' ? 'admin' : 'dashboard');
      } catch (err) {
        fehlerText.textContent = err.message;
        fehlerBox.classList.remove('versteckt');
      } finally {
        UI.btnLaden(btn, false);
      }
    });

    setTimeout(() => {
      const feld = document.getElementById('einl-passwort');
      if (feld) feld.focus();
    }, 50);
  },
};
