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

  async onboardingAbschliessen() {
    return this.anfrage('PATCH', '/auth/onboarding');
  },

  async passwortAendern(altesPasswort, neuesPasswort) {
    return this.anfrage('POST', '/auth/passwort-aendern', { altesPasswort, neuesPasswort });
  },

  async passwortVergessen(email) {
    return this.anfrage('POST', '/auth/passwort-vergessen', { email });
  },

  async passwortZuruecksetzen(token, passwort) {
    return this.anfrage('POST', '/auth/passwort-zuruecksetzen', { token, passwort });
  },

  // Nachrichten
  async nachrichtSenden(inhalt, originalTranskript = null) {
    return this.anfrage('POST', '/nachrichten/senden', { inhalt, originalTranskript });
  },

  async notfallSenden(inhalt, prioritaet, originalTranskript = null) {
    return this.anfrage('POST', '/nachrichten/notfall', { inhalt, prioritaet, originalTranskript });
  },

  async buttonKlicken(nachrichtId, btnId) {
    return this.anfrage('POST', `/nachrichten/klick/${nachrichtId}`, { btnId });
  },

  async audioTranskribieren(audioBlob) {
    const optionen = {
      method: 'POST',
      headers: {
        'Content-Type': audioBlob.type || 'audio/webm',
      },
      body: audioBlob
    };

    const token = this.getToken();
    if (token) {
      optionen.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const antwort = await fetch('/api/nachrichten/transkribieren', optionen);
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

  async meineNachrichten() {
    return this.anfrage('GET', '/nachrichten/meine');
  },

  async nachrichtAntworten(id, inhalt) {
    return this.anfrage('POST', `/nachrichten/${id}/antworten`, { inhalt });
  },

  // Admin - Nutzer
  async adminNutzerLaden() {
    return this.anfrage('GET', '/admin/nutzer');
  },

  async adminNutzerErstellen(benutzername, email, passwort, anzeigename) {
    return this.anfrage('POST', '/admin/nutzer', { benutzername, email, passwort, anzeigename });
  },

  async adminNutzerEinladen(benutzername, email, anzeigename) {
    return this.anfrage('POST', '/admin/nutzer/einladen', { benutzername, email, anzeigename });
  },

  async adminNutzerBearbeiten(id, benutzername, email, anzeigename, ntfy_topic, email_notifications) {
    return this.anfrage('PUT', `/admin/nutzer/${id}`, { benutzername, email, anzeigename, ntfy_topic, email_notifications });
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

  async adminNutzerPasswortReset(id) {
    return this.anfrage('POST', `/admin/nutzer/${id}/passwort-reset`);
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

  // Admin - Backups
  async adminBackupsLaden() {
    return this.anfrage('GET', '/admin/backups');
  },

  async adminBackupErstellen() {
    return this.anfrage('POST', '/admin/backups');
  },

  async adminBackupWiederherstellen(filename) {
    return this.anfrage('POST', `/admin/backups/${filename}/restore`);
  },

  // Admin - Notiz
  async adminNotizLaden() {
    return this.anfrage('GET', '/admin/notiz');
  },

  async adminNotizSpeichern(text) {
    return this.anfrage('POST', '/admin/notiz', { text });
  },

  // Admin - Broadcast
  async adminBroadcastSenden(betreff, nachricht, labelId = null) {
    return this.anfrage('POST', '/admin/broadcast', { betreff, nachricht, labelId });
  },

  // Admin - Labels
  async adminLabelsLaden() {
    return this.anfrage('GET', '/admin/labels');
  },

  async adminLabelErstellen(name, farbe) {
    return this.anfrage('POST', '/admin/labels', { name, farbe });
  },

  async adminLabelLoeschen(id) {
    return this.anfrage('DELETE', `/admin/labels/${id}`);
  },

  async adminNutzerLabelsLaden(nutzerId) {
    return this.anfrage('GET', `/admin/nutzer/${nutzerId}/labels`);
  },

  async adminNutzerLabelsSetzen(nutzerId, labelIds) {
    return this.anfrage('PUT', `/admin/nutzer/${nutzerId}/labels`, { labelIds });
  },

  // Geplante Nachrichten
  async nachrichtPlanen(inhalt, sendAt, prioritaet = null) {
    return this.anfrage('POST', '/nachrichten/planen', { inhalt, sendAt, prioritaet });
  },

  async nachrichtAbbrechen(id) {
    return this.anfrage('DELETE', `/nachrichten/${id}/abbrechen`);
  },

  // Pinnen
  async nachrichtPinnen(id) {
    return this.anfrage('POST', `/nachrichten/${id}/pinnen`);
  },
};
