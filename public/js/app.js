// yRelay - SPA-Router und App-Initialisierung
const App = {
  nutzer: null,

  async init() {
    // Token aus dem Storage laden und Nutzer verifizieren
    const token = API.getToken();
    if (token) {
      try {
        const nutzer = await API.ichLaden();
        this.nutzer = nutzer;
      } catch {
        // Token ungültig - ausloggen
        API.setToken(null);
        this.nutzer = null;
      }
    }

    // Hash-basiertes Routing initialisieren
    window.addEventListener('hashchange', () => this.routeVerarbeiten());
    this.routeVerarbeiten();
  },

  routeVerarbeiten() {
    const hash = window.location.hash || '#';
    const app = document.getElementById('app');
    if (!app) return;

    // Einladungs-Route (auch ohne Login erreichbar)
    if (hash.startsWith('#einladung/')) {
      const token = hash.slice('#einladung/'.length);
      app.innerHTML = EinladungView.rendern(token);
      EinladungView.initialisieren();
      return;
    }

    // Nicht eingeloggt - immer zur Login-Seite
    if (!this.nutzer) {
      app.innerHTML = LoginView.rendern();
      LoginView.initialisieren();
      return;
    }

    // Admin-Route
    if (hash === '#admin' || hash === '#admin/') {
      if (this.nutzer.rolle !== 'admin') {
        this.navigieren('dashboard');
        return;
      }
      app.innerHTML = AdminView.rendern(this.nutzer);
      AdminView.initialisieren(this.nutzer);
      return;
    }

    // Dashboard (Standard für eingeloggte Nutzer)
    app.innerHTML = DashboardView.rendern(this.nutzer);
    DashboardView.initialisieren(this.nutzer);
  },

  navigieren(ziel) {
    if (ziel === 'login') {
      window.location.hash = '#login';
    } else if (ziel === 'dashboard') {
      window.location.hash = '#dashboard';
    } else if (ziel === 'admin') {
      window.location.hash = '#admin';
    } else {
      window.location.hash = `#${ziel}`;
    }
  },

  abmelden() {
    this.nutzer = null;
    API.setToken(null);
    this.navigieren('login');
    UI.info('Du wurdest abgemeldet.');
  },
};

// App starten
App.init();
