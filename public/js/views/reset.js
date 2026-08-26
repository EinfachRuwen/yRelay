// yRelay - Passwort Reset View
const ResetView = {
  rendern(token) {
    if (!token) {
      window.location.hash = '#login';
      return '';
    }

    return `
      <div class="auth-container">
        <div class="karte auth-karte" style="max-width: 450px; margin: 60px auto; padding: 40px; text-align: center;">
          <div class="auth-header">
            <h1 class="gradient-text">Neues Passwort</h1>
            <p class="auth-untertitel" style="margin-top: 10px; color: #94a3b8;">Vergebe ein neues Passwort für dein Konto.</p>
          </div>

          <form id="reset-formular" class="auth-form" style="margin-top: 30px; text-align: left;">
            <div class="formular-gruppe" style="margin-bottom: 20px;">
              <label class="formular-label" for="reset-passwort">Neues Passwort</label>
              <div class="eingabe-wrapper">
                <i class="ph ph-lock eingabe-icon"></i>
                <input class="formular-eingabe mit-icon" type="password" id="reset-passwort" placeholder="Mindestens 8 Zeichen" required minlength="8">
              </div>
            </div>

            <button type="submit" class="btn btn-primaer btn-vollbreite btn-gross" id="reset-btn">
              <span>Passwort speichern</span>
            </button>
          </form>

          <div class="auth-footer" style="margin-top: 20px;">
            <a href="#login" class="text-link">Zurück zum Login</a>
          </div>
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
