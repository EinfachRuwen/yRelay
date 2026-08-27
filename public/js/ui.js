// yRelay - UI-Hilfsfunktionen
// Toast-Benachrichtigungen, Modals, Buttons, etc.

const UI = {
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
      <button class="toast-schliessen" onclick="UI.toastSchliessen(this.parentElement)" aria-label="Schließen">✕</button>
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
    const datum = new Date(iso);
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
    if (typ === 'emergency' && prioritaet === 'hoch') {
      return '<span class="verlauf-typ-badge warnung">⚠️ Wichtig</span>';
    }
    if (typ === 'emergency') {
      return '<span class="verlauf-typ-badge notfall">🚨 Notfall</span>';
    }
    return '<span class="verlauf-typ-badge frei">💬 Nachricht</span>';
  },

  // ─── Priorität-Text ────────────────────────────────────────────
  prioritaetText(prioritaet) {
    if (prioritaet === 'notfall') return '🚨 Notfall';
    if (prioritaet === 'hoch') return '⚠️ Hohe Priorität';
    return '-';
  },

  // ─── Poke-Antworten rendern (mehrere möglich) ────────────────────────
  renderAntworten(replyContent, userRepliesContent = null) {
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
      const datumTxt = a.time ? ` (${this.datumFormatieren(a.time)})` : '';
      
      if (a.absender === 'poke') {
        return `
          <div style="margin-top: 12px; padding: 12px 16px; background: rgba(6, 182, 212, 0.08); border-left: 3px solid var(--farbe-akzent); border-radius: 4px;">
            <div style="font-size: 11px; color: var(--farbe-akzent); font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              🤖 Poke hat geantwortet${this.escapeHtml(datumTxt)}
            </div>
            <div style="font-size: 13px; color: var(--farbe-text); line-height: 1.5; white-space: pre-wrap;">${this.escapeHtml(a.text)}</div>
          </div>
        `;
      } else {
        return `
          <div style="margin-top: 8px; margin-left: 20px; padding: 12px 16px; background: rgba(99, 102, 241, 0.08); border-left: 3px solid var(--farbe-primaer); border-radius: 4px;">
            <div style="font-size: 11px; color: var(--farbe-primaer-hell); font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              👤 Deine Antwort${this.escapeHtml(datumTxt)}
            </div>
            <div style="font-size: 13px; color: var(--farbe-text); line-height: 1.5; white-space: pre-wrap;">${this.escapeHtml(a.text)}</div>
          </div>
        `;
      }
    }).join('');
  },

  // ─── Leere-Liste-Placeholder ──────────────────────────────────────────
  leereListeHtml(emoji, text) {
    return `
      <div class="leere-liste">
        <span class="leere-liste-icon">${emoji}</span>
        ${this.escapeHtml(text)}
      </div>
    `;
  },
};

// ESC-Taste zum Schließen von Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') UI.modalSchliessen();
});
