// yRelay - API-Client
// Alle HTTP-Anfragen an das Backend

const API = {
  _token: null,

  setToken(token) {
    this._token = token;
    if (token) {
      localStorage.setItem('yrelay_token', token);
    } else {
      localStorage.removeItem('yrelay_token');
    }
  },

  getToken() {
    if (!this._token) {
      this._token = localStorage.getItem('yrelay_token');
    }
    return this._token;
  },

  async anfrage(methode, pfad, daten = null) {
    const optionen = {
      method: methode,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = this.getToken();
    if (token) {
      optionen.headers['Authorization'] = `Bearer ${token}`;
    }

    if (daten !== null) {
      optionen.body = JSON.stringify(daten);
    }

    try {
      const antwort = await fetch(`/api${pfad}`, optionen);
      const json = await antwort.json();

      if (!antwort.ok) {
        throw new Error(json.fehler || `Serverfehler ${antwort.status}`);
      }

      return json;
    } catch (err) {
      if (err.name === 'TypeError') {
        throw new Error('Verbindungsfehler. Server nicht erreichbar.');
      }
      throw err;
    }
  },

  // Auth
  async login(benutzername, passwort) {
    return this.anfrage('POST', '/auth/login', { benutzername, passwort });
  },

  async einladungAnnehmen(token, passwort) {
    return this.anfrage('POST', '/auth/einladung-annehmen', { token, passwort });
  },

  async ichLaden() {
    return this.anfrage('GET', '/auth/ich');
  },

  async passwortAendern(altesPasswort, neuesPasswort) {
    return this.anfrage('POST', '/auth/passwort-aendern', { altesPasswort, neuesPasswort });
  },

  // Nachrichten
  async nachrichtSenden(inhalt) {
    return this.anfrage('POST', '/nachrichten/senden', { inhalt });
  },

  async notfallSenden(inhalt, prioritaet) {
    return this.anfrage('POST', '/nachrichten/notfall', { inhalt, prioritaet });
  },

  async meineNachrichten() {
    return this.anfrage('GET', '/nachrichten/meine');
  },

  // Admin - Nutzer
  async adminNutzerLaden() {
    return this.anfrage('GET', '/admin/nutzer');
  },

  async adminNutzerErstellen(benutzername, email, passwort) {
    return this.anfrage('POST', '/admin/nutzer', { benutzername, email, passwort });
  },

  async adminNutzerEinladen(benutzername, email) {
    return this.anfrage('POST', '/admin/nutzer/einladen', { benutzername, email });
  },

  async adminNutzerStatus(id, aktiv) {
    return this.anfrage('PATCH', `/admin/nutzer/${id}`, { aktiv });
  },

  async adminNutzerLoeschen(id) {
    return this.anfrage('DELETE', `/admin/nutzer/${id}`);
  },

  async adminEinladungNeu(id) {
    return this.anfrage('POST', `/admin/nutzer/${id}/einladung-neu`);
  },

  // Admin - Nachrichten
  async adminNachrichtenLaden() {
    return this.anfrage('GET', '/admin/nachrichten');
  },

  // Admin - Einstellungen
  async adminEinstellungenLaden() {
    return this.anfrage('GET', '/admin/einstellungen');
  },

  async adminEinstellungenSpeichern(daten) {
    return this.anfrage('PUT', '/admin/einstellungen', daten);
  },

  async adminSmtpTesten(daten) {
    return this.anfrage('POST', '/admin/einstellungen/smtp-test', daten);
  },

  async adminStatistiken() {
    return this.anfrage('GET', '/admin/statistiken');
  },
};
