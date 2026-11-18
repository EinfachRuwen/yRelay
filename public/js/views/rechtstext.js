// yRelay - Rechtstext-View (Datenschutz, Impressum) – auch ohne Login erreichbar
const RechtstextView = {
  rendern(art) {
    const titel = art === 'impressum' ? 'Impressum' : 'Datenschutz';
    const zurueck = App.nutzer ? '#dashboard' : '#login';
    return `
      <div class="solo">
        <div class="solo-tafel rechtstext-tafel">
          <span class="wegweiser wegweiser-blau">yRelay</span>
          <h1>${UI.escapeHtml(titel)}</h1>
          <div class="tafel">
            <div id="rechtstext-inhalt" class="rechtstext" aria-live="polite"><div class="lade-spinner"></div></div>
          </div>
          <p style="margin-top:18px"><a href="${zurueck}" class="text-link">${App.nutzer ? 'Zurück zu den Nachrichten' : 'Zurück zur Anmeldung'}</a></p>
          ${UI.rechtsLinksHtml()}
        </div>
      </div>
    `;
  },

  async initialisieren(art) {
    const ziel = document.getElementById('rechtstext-inhalt');
    if (!ziel) return;
    try {
      const antwort = await fetch(`/api/rechtstexte/${encodeURIComponent(art)}`);
      const daten = await antwort.json();
      if (!antwort.ok) throw new Error(daten.fehler || 'Nicht hinterlegt.');
      if (daten.modus === 'url' && /^https?:\/\//i.test(daten.url || '')) {
        ziel.innerHTML = `<p>Der Betreiber stellt diesen Text extern bereit:</p>
          <p><a class="text-link" href="${UI.escapeHtml(daten.url)}" target="_blank" rel="noopener noreferrer">${UI.escapeHtml(daten.titel)} öffnen ${UI.icon('extern')}</a></p>`;
        return;
      }
      // Das HTML wird serverseitig aus maskiertem Markdown erzeugt (nur sichere Tags)
      ziel.innerHTML = daten.html || '';
    } catch (err) {
      ziel.innerHTML = `<p class="text-gedaempft">${UI.escapeHtml(err.message)}</p>`;
    }
  },
};
