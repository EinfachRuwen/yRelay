// yRelay - UI-Hilfsfunktionen
// Toast-Benachrichtigungen, Modals, Buttons, etc.

const UI = {
  // ─── Icons (Lucide-Sprite unter /img/icons.svg) ───────────────────────
  icon(name, klasse = '') {
    return `<svg class="icon ${klasse}" aria-hidden="true" focusable="false"><use href="/img/icons.svg#i-${name}"></use></svg>`;
  },

  // ─── Darstellung (System / Hell / Dunkel) ─────────────────────────────
  themaLaden() {
    let thema = 'system';
    try { thema = localStorage.getItem('yrelay_thema') || 'system'; } catch {}
    if (thema === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', thema);
    return thema;
  },

  themaWechseln() {
    const reihe = ['system', 'light', 'dark'];
    const naechstes = reihe[(reihe.indexOf(this.themaLaden()) + 1) % reihe.length];
    try { localStorage.setItem('yrelay_thema', naechstes); } catch {}
    this.themaLaden();
    document.querySelectorAll('[data-thema-wert]').forEach(el => { el.textContent = this.themaName(naechstes); });
  },

  themaName(thema) {
    return { system: 'System', light: 'Hell', dark: 'Dunkel' }[thema] || 'System';
  },

  // ─── Gemeinsame Kopfzeile für alle Bereiche ───────────────────────────
  marke() {
    return `<svg class="marke-zeichen" viewBox="0 0 18 18" aria-hidden="true"><rect x="0.75" y="0.75" width="16.5" height="16.5" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="4" fill="var(--signal)"/></svg><span>yRelay</span>`;
  },

  kopfzeile(nutzer, aktiv = '') {
    const name = nutzer.anzeigename || nutzer.benutzername || '';
    const buchstabe = (name || '?')[0].toUpperCase();
    const istAdmin = nutzer.rolle === 'admin';
    const schule = nutzer.schul_dashboard_global_enabled && nutzer.has_schul_access;
    const link = (ziel, icon, text, extra = '') =>
      `<a class="kopf-link${aktiv === ziel ? ' aktiv' : ''}" href="#${ziel}" ${aktiv === ziel ? 'aria-current="page"' : ''} ${extra}>${this.icon(icon)}<span>${text}</span></a>`;
    const links = [
      link('dashboard', 'messages-square', 'Nachrichten'),
      schule ? link('schule', 'graduation-cap', 'Schule') : '',
      link('spiele', 'gamepad-2', 'Spiele', `data-spiele-link ${aktiv === 'spiele' ? '' : 'hidden'}`),
      istAdmin ? link('admin', 'shield-check', 'Verwaltung') : '',
    ].join('');
    document.body.classList.add('hat-unten-nav');
    return `
      <header class="kopfzeile">
        <div class="kopfzeile-innen">
          <a class="marke" href="#dashboard" id="header-logo" aria-label="yRelay – zu den Nachrichten">${this.marke()}</a>
          <nav class="kopf-nav" aria-label="Bereiche">${links}</nav>
          <div class="kopf-rechts">
            <details class="konto">
              <summary aria-label="Konto">
                <span class="avatar">${this.escapeHtml(buchstabe)}</span>
                <span class="konto-text"><span class="konto-name">${this.escapeHtml(name)}</span></span>
                ${this.icon('chevron-down')}
              </summary>
              <div class="konto-menue" role="menu">
                <div class="konto-menue-kopf">
                  <div class="konto-name">${this.escapeHtml(name)}</div>
                  <span class="konto-rolle">${istAdmin ? 'Administrator' : 'Mitglied'}${nutzer.email ? ' · ' + this.escapeHtml(nutzer.email) : ''}</span>
                </div>
                <button class="menue-eintrag" type="button" data-konto="profil" role="menuitem">${this.icon('user')} Profil und Benachrichtigungen</button>
                <button class="menue-eintrag" type="button" data-konto="passwort" role="menuitem">${this.icon('key-round')} Passwort ändern</button>
                <button class="menue-eintrag" type="button" data-konto="thema" role="menuitem">${this.icon('sun')} Darstellung <span class="menue-wert" data-thema-wert>${this.themaName(this.themaLaden())}</span></button>
                <div class="menue-trenner"></div>
                <button class="menue-eintrag" type="button" data-konto="abmelden" role="menuitem">${this.icon('log-out')} Abmelden</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <nav class="unten-nav" aria-label="Bereiche">${links}</nav>
    `;
  },

  kopfzeileInit() {
    const konto = document.querySelector('.konto');
    document.querySelectorAll('[data-konto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const aktion = btn.dataset.konto;
        if (aktion !== 'thema' && konto) konto.open = false;
        if (aktion === 'profil') DashboardView.profilModal(App.nutzer);
        else if (aktion === 'passwort') DashboardView.passwortAendernModal();
        else if (aktion === 'thema') this.themaWechseln();
        else if (aktion === 'abmelden') App.abmelden();
      });
    });
    if (konto && !this._kontoKlickGebunden) {
      this._kontoKlickGebunden = true;
      document.addEventListener('click', (e) => {
        const offen = document.querySelector('.konto[open]');
        if (offen && !offen.contains(e.target)) offen.open = false;
      });
    }
    // Spiele nur zeigen, wenn mindestens ein Spiel verfügbar ist
    const spieleLinks = document.querySelectorAll('[data-spiele-link][hidden]');
    if (spieleLinks.length) {
      API.anfrage('GET', '/games/verfuegbar').then(daten => {
        if (daten.spiele && daten.spiele.some(sp => sp.istVerfuegbar)) spieleLinks.forEach(l => l.hidden = false);
      }).catch(() => {});
    }
  },

  // ─── Toast-Benachrichtigungen ─────────────────────────────────────────
  toast(text, typ = 'info', dauer = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      erfolg: '✅',
      fehler: '❌',
      warnung: '⚠️',
      info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${typ}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[typ] || icons.info}</span>
      <span class="toast-text">${this.escapeHtml(text)}</span>
      <button class="toast-schliessen" onclick="UI.toastSchliessen(this.parentElement)" aria-label="Schließen">${this.icon('x')}</button>
    `;

    container.appendChild(toast);

    if (dauer > 0) {
      setTimeout(() => this.toastSchliessen(toast), dauer);
    }
  },

  toastSchliessen(element) {
    if (!element || element.classList.contains('verlassen')) return;
    element.classList.add('verlassen');
    setTimeout(() => element.remove(), 250);
  },

  erfolg(text) { this.toast(text, 'erfolg'); },
  fehler(text, dauer = 6000) { this.toast(text, 'fehler', dauer); },
  warnung(text) { this.toast(text, 'warnung'); },
  info(text) { this.toast(text, 'info'); },

  // ─── Modal ────────────────────────────────────────────────────────────
  modalZeigen(inhalt) {
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-inhalt');
    if (!overlay || !box) return;
    box.innerHTML = inhalt;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    overlay.onclick = (e) => {
      if (e.target === overlay) this.modalSchliessen();
    };
  },

  modalSchliessen() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  },

  // ─── Button-Ladezustand ───────────────────────────────────────────────
  btnLaden(btn, laedt) {
    if (!btn) return;
    if (laedt) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.classList.add('btn-laedt');
      const spinnerHtml = `<span class="btn-spinner"></span><span class="btn-text">${btn.textContent.trim()}</span>`;
      btn.innerHTML = spinnerHtml;
    } else {
      btn.disabled = false;
      btn.classList.remove('btn-laedt');
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
        delete btn.dataset.originalText;
      }
    }
  },

  // ─── Sicher HTML escapen ──────────────────────────────────────────────
  escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  },

  // ─── Datum formatieren ────────────────────────────────────────────────
  datumFormatieren(iso) {
    if (!iso) return '-';
    let parseStr = iso;
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.match(/[+-]\d{2}:?\d{2}$/)) {
      parseStr = iso.replace(' ', 'T') + 'Z';
    }
    const datum = new Date(parseStr);
    const jetzt = new Date();
    const diff = jetzt - datum;

    // Weniger als 1 Minute
    if (diff < 60000) return 'Gerade eben';

    // Weniger als 1 Stunde
    if (diff < 3600000) {
      const min = Math.floor(diff / 60000);
      return `Vor ${min} Min.`;
    }

    // Weniger als 24 Stunden
    if (diff < 86400000) {
      const std = Math.floor(diff / 3600000);
      return `Vor ${std} Std.`;
    }

    // Mehr als 24 Stunden - vollständiges Datum
    return datum.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // ─── Zeichenzähler ────────────────────────────────────────────────────
  zeichenZaehler(textarea, zaehler, max) {
    const update = () => {
      const laenge = textarea.value.length;
      zaehler.textContent = `${laenge} / ${max}`;
      zaehler.classList.remove('warnung', 'ueberschritten');
      if (laenge > max * 0.9) zaehler.classList.add('warnung');
      if (laenge > max) zaehler.classList.add('ueberschritten');
    };
    textarea.addEventListener('input', update);
    update();
  },

  // ─── Nachrichtentyp-Badge ─────────────────────────────────────────────
  typBadge(typ, prioritaet) {
    if (typ === 'emergency' && prioritaet === 'hoch') return '<span class="verlauf-typ-badge warnung">Wichtig</span>';
    if (typ === 'emergency') return '<span class="verlauf-typ-badge notfall">Notfall</span>';
    if (typ === 'school') return '<span class="verlauf-typ-badge frei">Schule</span>';
    return '<span class="verlauf-typ-badge frei">Nachricht</span>';
  },

  // ─── Priorität-Text ────────────────────────────────────────────
  prioritaetText(prioritaet) {
    if (prioritaet === 'notfall') return 'Notfall';
    if (prioritaet === 'hoch') return 'Hohe Priorität';
    return '-';
  },

  // ─── Agenten-Antworten rendern (mehrere möglich) ─────────────────────
  renderAntworten(nachrichtId, replyContent, userRepliesContent = null, agentName = 'KI-Agent') {
    if (!replyContent) return '';

    // Rückwärtskompatibel: JSON-Array oder Plain-Text für Poke-Antworten
    let pokeAntworten = [];
    try {
      const parsed = JSON.parse(replyContent);
      pokeAntworten = Array.isArray(parsed) ? parsed : [{ text: replyContent, time: null }];
    } catch {
      pokeAntworten = [{ text: replyContent, time: null }];
    }
    pokeAntworten = pokeAntworten.map(a => ({ ...a, absender: 'poke' }));

    // Nutzer-Antworten (Gegenantworten)
    let nutzerAntworten = [];
    if (userRepliesContent) {
      try {
        const parsed = JSON.parse(userRepliesContent);
        if (Array.isArray(parsed)) {
          nutzerAntworten = parsed.map(a => ({ ...a, absender: 'nutzer' }));
        }
      } catch {}
    }

    // Beide Arrays zusammenführen und nach Zeit sortieren
    const alle = [...pokeAntworten, ...nutzerAntworten].sort((a, b) => {
      if (!a.time) return -1;
      if (!b.time) return 1;
      return new Date(a.time) - new Date(b.time);
    });

    return alle.map(a => {
      const zeit = a.time ? `<time datetime="${this.escapeHtml(a.time)}">· ${this.escapeHtml(this.datumFormatieren(a.time))}</time>` : '';

      if (a.absender === 'poke') {
        let buttonsHtml = '';
        if (a.buttons && a.buttons.length > 0) {
          const klassen = { primaer: 'btn-primaer', sekundaer: 'btn-sekundaer', warnung: 'btn-warnung', notfall: 'btn-notfall' };
          const btnTags = a.buttons.map(btn => {
            const klasse = klassen[btn.style] || 'btn-primaer';
            const oc = a.buttons_disabled ? '' : `onclick="DashboardView.buttonKlick(this, ${nachrichtId}, '${this.escapeHtml(btn.id)}')"`;
            return `<button type="button" class="btn btn-klein ${klasse}" ${oc} ${a.buttons_disabled ? 'disabled' : ''}>${this.escapeHtml(btn.text)}</button>`;
          }).join('');
          buttonsHtml = `<div class="antwort-buttons">${btnTags}</div>`;
        }

        return `
          <div class="antwort">
            <div class="antwort-kopf">${this.icon('bot')} ${this.escapeHtml(agentName)} ${zeit}</div>
            <div class="antwort-text">${this.escapeHtml(a.text)}</div>
            ${buttonsHtml}
          </div>
        `;
      }
      return `
        <div class="antwort eigene">
          <div class="antwort-kopf">${this.icon('reply')} Deine Antwort ${zeit}</div>
          <div class="antwort-text">${this.escapeHtml(a.text)}</div>
        </div>
      `;
    }).join('');
  },

  // ─── Spezielle Nachrichten rendern ─────────────────────────────────────
  renderInhalt(text) {
    const match = text.match(/^\[SPECIAL:([A-Z_]+)\]/);
    if (match) {
      // Agenten-Hinweis entfernen für saubere Anzeige
      text = text.replace(/^\[SPECIAL:[A-Z_]+\]\s*/, '').split('\n\nHinweis für Poke:')[0].split('\n\nHinweis für den Agenten:')[0];
      const arten = {
        DOORBELL: ['door-open', 'anim-doorbell', ''],
        SOS: ['siren', 'anim-sos', ''],
        DEADLINE: ['hourglass', 'anim-deadline', 'achtung'],
        WAKEUP: ['alarm-clock', 'anim-wakeup', ''],
        WHERE_ARE_YOU: ['map-pin', 'anim-radar', 'achtung'],
      };
      const art = arten[match[1]];
      if (art) {
        return `
          <div class="special-inhalt">
            <span class="special-icon ${art[1]} ${art[2]}">${this.icon(art[0])}</span>
            <div class="verlauf-inhalt">${this.escapeHtml(text)}</div>
          </div>
        `;
      }
    }
    return `<div class="verlauf-inhalt">${this.escapeHtml(text)}</div>`;
  },

  // ─── Leere-Liste-Placeholder ──────────────────────────────────────────
  // Erstes Argument: Icon-Name aus dem Sprite (z. B. 'inbox') oder ein Zeichen
  leereListeHtml(icon, text) {
    const zeichen = /^[a-z0-9-]+$/.test(icon) ? this.icon(icon) : this.escapeHtml(icon);
    return `
      <div class="leere-liste">
        <span class="leere-liste-icon">${zeichen}</span>
        <span>${this.escapeHtml(text)}</span>
      </div>
    `;
  },
};

// ESC-Taste zum Schließen von Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') UI.modalSchliessen();
});
