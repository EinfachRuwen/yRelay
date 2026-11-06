// yRelay - UI-Hilfsfunktionen
// Icons, Kopfband, Toasts, Modals, Buttons und der Linienplan für Nachrichten.

const UI = {
  // ─── Icons (Phosphor-Sprite unter /img/icons.svg) ─────────────────────
  icon(name, klasse = '') {
    return `<svg class="icon ${klasse}" aria-hidden="true"><use href="/img/icons.svg#i-${name}"></use></svg>`;
  },

  // Emoji aus älteren Aufrufen auf Icons abbilden
  _emojiIcon: {
    '📭': 'nachricht', '🏷️': 'label', '👤': 'nutzer', '🛡️': 'backup', '🎮': 'spiele', '📋': 'aufgaben',
    '📅': 'kalender', '🔔': 'glocke', '📜': 'protokoll', '🤖': 'agent', '✉️': 'mail', '📧': 'mail',
  },

  // ─── Toast-Benachrichtigungen ─────────────────────────────────────────
  toast(text, typ = 'info', dauer = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { erfolg: 'ok', fehler: 'fehler', warnung: 'wichtig', info: 'info' };
    // Emoji am Ende/Anfang von Meldungen entfernen – die Icons tragen den Ton
    const sauber = String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

    const toast = document.createElement('div');
    toast.className = `toast ${typ}`;
    toast.setAttribute('role', typ === 'fehler' ? 'alert' : 'status');
    toast.innerHTML = `
      ${this.icon(icons[typ] || icons.info, 'toast-icon')}
      <span class="toast-text">${this.escapeHtml(sauber)}</span>
      <button class="toast-schliessen" onclick="UI.toastSchliessen(this.parentElement)" aria-label="Schließen">${this.icon('x')}</button>
    `;
    container.appendChild(toast);
    if (dauer > 0) setTimeout(() => this.toastSchliessen(toast), dauer);
  },

  toastSchliessen(element) {
    if (!element || element.classList.contains('verlassen')) return;
    element.classList.add('verlassen');
    setTimeout(() => element.remove(), 220);
  },

  erfolg(text) { this.toast(text, 'erfolg'); },
  fehler(text, dauer = 6000) { this.toast(text, 'fehler', dauer); },
  warnung(text) { this.toast(text, 'warnung'); },
  info(text) { this.toast(text, 'info'); },

  // ─── Kopfband & Navigation ────────────────────────────────────────────
  _bereiche(nutzer) {
    const b = [{ id: 'dashboard', href: '#dashboard', name: 'Nachrichten', icon: 'nachricht' }];
    if (nutzer.schul_dashboard_global_enabled && nutzer.has_schul_access) b.push({ id: 'schule', href: '#schule', name: 'Schule', icon: 'schule' });
    b.push({ id: 'spiele', href: '#spiele', name: 'Spiele', icon: 'spiele', spiele: true });
    if (nutzer.rolle === 'admin') b.push({ id: 'admin', href: '#admin', name: 'Verwaltung', icon: 'zahnrad' });
    return b;
  },

  // Kopfband + (mobil) untere Leiste. aktiv = 'dashboard' | 'schule' | 'spiele' | 'admin'
  kopf(nutzer, aktiv) {
    const name = nutzer.anzeigename || nutzer.benutzername || '';
    const kuerzel = (name || 'U').trim().charAt(0).toUpperCase();
    const bereiche = this._bereiche(nutzer);
    const link = (b, klasse = '') => `<a href="${b.href}" class="${klasse} ${b.spiele ? 'nav-spiele versteckt' : ''}" ${b.id === aktiv ? 'aria-current="page"' : ''}>${this.icon(b.icon)}<span>${b.name}</span></a>`;
    const html = `
      <header class="band">
        <div class="band-innen">
          <a class="wegweiser" href="#dashboard" id="header-logo" aria-label="yRelay – zu den Nachrichten">yRelay</a>
          <nav class="band-nav" aria-label="Hauptbereiche">${bereiche.map(b => link(b)).join('')}</nav>
          <div class="band-rechts">
            <button class="band-menue-knopf" id="nutzer-menue-knopf" aria-haspopup="menu" aria-expanded="false">
              <span class="kuerzel">${this.escapeHtml(kuerzel)}</span>
              <span class="name">${this.escapeHtml(name)}</span>
              ${this.icon('runter')}
            </button>
            <div class="menue versteckt" id="nutzer-menue" role="menu">
              <div class="menue-kopf"><strong>${this.escapeHtml(name)}</strong><span>${nutzer.rolle === 'admin' ? 'Verwaltung' : 'Eingeladen'}${nutzer.email ? ' · ' + this.escapeHtml(nutzer.email) : ''}</span></div>
              <button role="menuitem" data-menue="profil">${this.icon('nutzer')} Profil und Benachrichtigungen</button>
              <button role="menuitem" data-menue="passwort">${this.icon('schloss')} Passwort ändern</button>
              <button role="menuitem" data-menue="thema">${this.icon('mond')} <span id="thema-text">Dunkles Design</span></button>
              <button role="menuitem" data-menue="abmelden">${this.icon('abmelden')} Abmelden</button>
            </div>
          </div>
        </div>
      </header>
      ${bereiche.length > 1 ? `<nav class="unterleiste" aria-label="Hauptbereiche">${bereiche.map(b => link(b)).join('')}</nav>` : ''}
    `;
    // Nach dem Einhängen verdrahten
    setTimeout(() => this._kopfVerdrahten(nutzer), 0);
    return html;
  },

  _kopfVerdrahten(nutzer) {
    document.body.classList.toggle('mit-unterleiste', !!document.querySelector('.unterleiste'));
    const knopf = document.getElementById('nutzer-menue-knopf');
    const menue = document.getElementById('nutzer-menue');
    if (!knopf || !menue || knopf.dataset.verdrahtet) return;
    knopf.dataset.verdrahtet = '1';
    this._themaText();

    const zu = () => { menue.classList.add('versteckt'); knopf.setAttribute('aria-expanded', 'false'); };
    knopf.addEventListener('click', (e) => {
      e.stopPropagation();
      const offen = menue.classList.toggle('versteckt') === false;
      knopf.setAttribute('aria-expanded', String(offen));
      if (offen) menue.querySelector('button')?.focus();
    });
    document.addEventListener('click', (e) => { if (!menue.contains(e.target)) zu(); });
    menue.addEventListener('keydown', (e) => { if (e.key === 'Escape') { zu(); knopf.focus(); } });
    menue.addEventListener('click', (e) => {
      const ziel = e.target.closest('[data-menue]');
      if (!ziel) return;
      const aktion = ziel.dataset.menue;
      if (aktion === 'thema') { this.themaWechseln(); return; }
      zu();
      if (aktion === 'abmelden') App.abmelden();
      if (aktion === 'profil') DashboardView.profilModal(nutzer);
      if (aktion === 'passwort') DashboardView.passwortAendernModal();
    });

    // Spiele-Bereich nur zeigen, wenn mindestens ein Spiel freigegeben ist
    if (this._spieleVerfuegbar === undefined) {
      API.anfrage('GET', '/games/verfuegbar').then(d => {
        this._spieleVerfuegbar = !!(d.spiele && d.spiele.some(s => s.istVerfuegbar));
        this._spieleNavZeigen();
      }).catch(() => {});
    } else {
      this._spieleNavZeigen();
    }
  },

  _spieleNavZeigen() {
    const aufSpiele = (window.location.hash || '').startsWith('#spiele');
    document.querySelectorAll('.nav-spiele').forEach(a => a.classList.toggle('versteckt', !(this._spieleVerfuegbar || aufSpiele)));
  },

  // Helles/dunkles Design: Standard folgt dem System, Wahl wird gemerkt
  themaWechseln() {
    const dunkelJetzt = this._istDunkel();
    const neu = dunkelJetzt ? 'light' : 'dark';
    document.documentElement.dataset.theme = neu;
    try { localStorage.setItem('yrelay_thema', neu); } catch (e) {}
    this._themaText();
  },
  _istDunkel() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  _themaText() {
    const el = document.getElementById('thema-text');
    if (el) el.textContent = this._istDunkel() ? 'Helles Design' : 'Dunkles Design';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = this._istDunkel() ? '#0b4374' : '#0e518d';
  },

  // ─── Modal ────────────────────────────────────────────────────────────
  modalZeigen(inhalt) {
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-inhalt');
    if (!overlay || !box) return;
    this._fokusVorModal = document.activeElement;
    box.innerHTML = inhalt;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.onclick = (e) => { if (e.target === overlay) this.modalSchliessen(); };
    const erstes = box.querySelector('input:not([type=hidden]), textarea, select, button:not(.modal-schliessen)');
    setTimeout(() => erstes?.focus(), 30);
  },

  modalSchliessen() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (this._fokusVorModal && document.contains(this._fokusVorModal)) this._fokusVorModal.focus();
  },

  modalKopf(titel) {
    return `<div class="modal-header"><h2 class="modal-titel">${this.escapeHtml(titel)}</h2><button class="modal-schliessen" onclick="UI.modalSchliessen()" aria-label="Schließen">${this.icon('x')}</button></div>`;
  },

  // ─── Button-Ladezustand ───────────────────────────────────────────────
  btnLaden(btn, laedt) {
    if (!btn) return;
    if (laedt) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.classList.add('btn-laedt');
      btn.innerHTML = `<span class="btn-spinner"></span><span class="btn-text">${this.escapeHtml(btn.textContent.trim())}</span>`;
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
    div.appendChild(document.createTextNode(text == null ? '' : String(text)));
    return div.innerHTML;
  },

  // ─── Datum ────────────────────────────────────────────────────────────
  _datum(iso) {
    if (!iso) return null;
    let s = iso;
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.match(/[+-]\d{2}:?\d{2}$/)) s = iso.replace(' ', 'T') + 'Z';
    const d = new Date(s);
    return isNaN(d) ? null : d;
  },

  datumFormatieren(iso) {
    const datum = this._datum(iso);
    if (!datum) return '–';
    const diff = Date.now() - datum;
    if (diff < 60000) return 'Gerade eben';
    if (diff < 3600000) return `Vor ${Math.floor(diff / 60000)} Min.`;
    if (diff < 86400000) return `Vor ${Math.floor(diff / 3600000)} Std.`;
    return datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  uhrzeit(iso) {
    const d = this._datum(iso);
    return d ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  },

  // "Heute", "Gestern" oder "Mi., 04.11."
  tagName(iso) {
    const d = this._datum(iso);
    if (!d) return '';
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const tag = new Date(d); tag.setHours(0, 0, 0, 0);
    const delta = Math.round((heute - tag) / 86400000);
    if (delta === 0) return 'Heute';
    if (delta === 1) return 'Gestern';
    if (delta === -1) return 'Morgen';
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
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

  // ─── Plaketten ────────────────────────────────────────────────────────
  stufeVon(typ, prioritaet) {
    if (typ === 'emergency' && prioritaet === 'hoch') return 'hoch';
    if (typ === 'emergency' || prioritaet === 'notfall') return 'notfall';
    if (prioritaet === 'hoch') return 'hoch';
    return 'standard';
  },

  typBadge(typ, prioritaet) {
    const s = this.stufeVon(typ, prioritaet);
    if (s === 'hoch') return `<span class="plakette plakette-orange">${this.icon('wichtig')}Wichtig</span>`;
    if (s === 'notfall') return `<span class="plakette plakette-rot">${this.icon('notfall')}Notfall</span>`;
    return '';
  },

  prioritaetText(prioritaet) {
    if (prioritaet === 'notfall') return 'Notfall';
    if (prioritaet === 'hoch') return 'Hohe Priorität';
    return '–';
  },

  // ─── Sondernachrichten ([SPECIAL:TYP]) ────────────────────────────────
  _sonder: {
    DOORBELL: { icon: 'tuer', name: 'Tür klingelt', anim: 'anim-doorbell' },
    SOS: { icon: 'notfall', name: 'SOS' },
    DEADLINE: { icon: 'deadline', name: 'Deadline' },
    WAKEUP: { icon: 'wecker', name: 'Wecker' },
    WHERE_ARE_YOU: { icon: 'standort', name: 'Wo bist du?' },
  },

  sonderAuslesen(text) {
    const match = String(text || '').match(/^\[SPECIAL:([A-Z_]+)\]/);
    if (!match) return null;
    const sauber = text.replace(/^\[SPECIAL:[A-Z_]+\]\s*/, '').split(/\n\nHinweis für (Poke|den Agenten):/)[0];
    return { typ: match[1], text: sauber, ...(this._sonder[match[1]] || { icon: 'notfall', name: match[1] }) };
  },

  renderInhalt(text) {
    const s = this.sonderAuslesen(text);
    if (s) return `<p class="fahrt-text besonders"><span class="zeichen ${s.anim || ''}">${this.icon(s.icon)}</span><span>${this.escapeHtml(s.text)}</span></p>`;
    return `<p class="fahrt-text">${this.escapeHtml(text)}</p>`;
  },

  // ─── Linienplan einer Nachricht ───────────────────────────────────────
  // Jede Nachricht ist eine Fahrt: Übergabe → Antworten → Ziel (erledigt / offen / gestört).
  _antwortenSammeln(replyContent, userRepliesContent) {
    let agent = [];
    if (replyContent) {
      try {
        const p = JSON.parse(replyContent);
        agent = Array.isArray(p) ? p : [{ text: replyContent, time: null }];
      } catch { agent = [{ text: replyContent, time: null }]; }
    }
    agent = agent.map(a => ({ ...a, absender: 'agent' }));
    let eigene = [];
    if (userRepliesContent) {
      try { const p = JSON.parse(userRepliesContent); if (Array.isArray(p)) eigene = p.map(a => ({ ...a, absender: 'nutzer' })); } catch {}
    }
    return [...agent, ...eigene].sort((a, b) => {
      if (!a.time) return -1; if (!b.time) return 1;
      return new Date(a.time) - new Date(b.time);
    });
  },

  _agentKnoepfe(nachrichtId, a) {
    if (!a.buttons || a.buttons.length === 0) return '';
    const stil = { sekundaer: 'sekundaer', warnung: 'warnung', notfall: 'notfall' };
    return `<div class="halt-knoepfe">${a.buttons.map(btn => `
      <button type="button" class="agent-knopf ${stil[btn.style] || ''}" ${a.buttons_disabled ? 'disabled' : `onclick="DashboardView.buttonKlick(this, ${nachrichtId}, '${this.escapeHtml(btn.id)}')"`}>${this.escapeHtml(btn.text)}</button>
    `).join('')}</div>`;
  },

  linieHtml(n, optionen = {}) {
    const agent = this.escapeHtml(n.agentName || 'Agent');
    const halte = [];
    const geplant = n.status === 'geplant';
    const abgebrochen = n.status === 'abgebrochen';
    const fehlgeschlagen = !geplant && !abgebrochen && n.status !== 'gesendet';

    if (geplant) {
      const t = this._datum(n.geplantesSenden);
      const wann = t ? `${this.tagName(n.geplantesSenden)}, ${this.uhrzeit(n.geplantesSenden)} Uhr` : 'später';
      halte.push(`<li class="halt geplant offen"><span class="halt-punkt"></span><span class="halt-zeit">${this.uhrzeit(n.geplantesSenden)}</span><div class="halt-inhalt"><div class="halt-name">Geplant für ${wann}</div>${optionen.admin ? '' : `<div class="halt-knoepfe"><button class="btn btn-sekundaer btn-klein" onclick="DashboardView.nachrichtAbbrechen(${n.id})">${this.icon('x')}Nicht senden</button></div>`}</div></li>`);
      return `<ol class="linie">${halte.join('')}</ol>`;
    }

    halte.push({ html: `<span class="halt-zeit">${this.uhrzeit(n.gesendetAm)}</span><div class="halt-inhalt"><div class="halt-name">An ${agent} übergeben</div></div>`, klasse: '' });

    if (abgebrochen) {
      halte.push({ html: `<span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">Abgebrochen</div></div>`, klasse: 'ziel offen' });
    } else if (fehlgeschlagen) {
      halte.push({ html: `<span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">Zustellung fehlgeschlagen</div>${n.fehler ? `<div class="halt-fehler">${this.escapeHtml(n.fehler)}</div>` : ''}</div>`, klasse: 'ziel gestoert', punkt: this.icon('x') });
    } else {
      for (const a of this._antwortenSammeln(n.antwortText, n.nutzerAntworten)) {
        const eigen = a.absender === 'nutzer';
        halte.push({
          html: `<span class="halt-zeit">${a.time ? this.uhrzeit(a.time) : ''}</span><div class="halt-inhalt"><div class="halt-name">${eigen ? (optionen.admin ? 'Rückmeldung' : 'Du') : agent}${a.time && this.tagName(a.time) !== this.tagName(n.gesendetAm) ? ` <small>${this.tagName(a.time)}</small>` : ''}</div><div class="halt-text">${this.escapeHtml(a.text)}</div>${eigen ? '' : this._agentKnoepfe(n.id, a)}</div>`,
          klasse: eigen ? 'eigene' : 'antwort',
        });
      }
      if (n.statusLabel === 'erledigt') {
        halte.push({ html: `<span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">Erledigt</div>${n.statusLabelNotiz ? `<div class="halt-text">${this.escapeHtml(n.statusLabelNotiz)}</div>` : ''}</div>`, klasse: 'ziel erledigt', punkt: this.icon('haken') });
      } else if (n.statusLabel === 'in_bearbeitung') {
        halte.push({ html: `<span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">${agent} kümmert sich darum</div>${n.statusLabelNotiz ? `<div class="halt-text">${this.escapeHtml(n.statusLabelNotiz)}</div>` : ''}</div>`, klasse: 'ziel bearbeitung' });
      } else if (!n.antwortText) {
        halte.push({ html: `<span class="halt-zeit"></span><div class="halt-inhalt"><div class="halt-name">Wartet auf Antwort von ${agent}</div></div>`, klasse: 'ziel offen' });
      }
    }

    return `<ol class="linie">${halte.map((h, i) => {
      const naechster = halte[i + 1];
      const vorOffen = naechster && /offen/.test(naechster.klasse) ? ' vor-offen' : '';
      return `<li class="halt ${h.klasse}${vorOffen}"><span class="halt-punkt">${h.punkt || ''}</span>${h.html}</li>`;
    }).join('')}</ol>`;
  },

  // Rückwärtskompatibel (wird von älteren Ansichten aufgerufen)
  renderAntworten(nachrichtId, replyContent, userRepliesContent = null, agentName = 'Agent') {
    if (!replyContent) return '';
    return this.linieHtml({ id: nachrichtId, status: 'gesendet', antwortText: replyContent, nutzerAntworten: userRepliesContent, agentName }, { admin: true });
  },

  // ─── Leere Liste ──────────────────────────────────────────────────────
  leereListeHtml(iconOderEmoji, text, titel = '') {
    const name = this._emojiIcon[iconOderEmoji] || (/^[a-z0-9-]+$/.test(iconOderEmoji) ? iconOderEmoji : 'info');
    return `
      <div class="leere-liste">
        <span class="leere-liste-icon">${this.icon(name)}</span>
        ${titel ? `<strong>${this.escapeHtml(titel)}</strong>` : ''}
        <div>${this.escapeHtml(text)}</div>
      </div>
    `;
  },
};

// Gespeichertes Design übernehmen, bevor gerendert wird
try { const t = localStorage.getItem('yrelay_thema'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}

// ESC schließt Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') UI.modalSchliessen();
});
