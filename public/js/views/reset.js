// yRelay - Passwort Reset View
const ResetView = {
  rendern(token) {
    if (!token) {
      window.location.hash = '#login';
      return '';
    }

    return `
      <div class="solo">
        <div class="solo-tafel">
          <span class="wegweiser wegweiser-blau">yRelay</span>
          <h1>Neues Passwort</h1>
          <p class="unterzeile">Lege ein neues Passwort für deinen Zugang fest.</p>
          <div class="tafel">
            <form id="reset-formular">
              <div class="formular-gruppe">
                <label class="formular-label" for="reset-passwort">Neues Passwort</label>
                <input class="formular-eingabe" type="password" id="reset-passwort" autocomplete="new-password" required minlength="8">
                <div class="formular-hilfe">Mindestens 8 Zeichen.</div>
              </div>
              <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="reset-btn">Passwort speichern</button>
            </form>
          </div>
          <p style="margin-top:18px"><a href="#login" class="text-link">Zurück zur Anmeldung</a></p>
        </div>
      </div>
    `;
  },

  initialisieren(token) {
    const formular = document.getElementById('reset-formular');
    if (!formular) return;

    formular.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const passwort = document.getElementById('reset-passwort').value;
      const btn = document.getElementById('reset-btn');
      
      UI.btnLaden(btn, true);
      
      try {
        const antwort = await API.passwortZuruecksetzen(token, passwort);
        UI.erfolg(antwort.nachricht);
        setTimeout(() => {
          window.location.hash = '#login';
        }, 2000);
      } catch (err) {
        UI.fehler(err.message);
        UI.btnLaden(btn, false);
      }
    });
  }
};
