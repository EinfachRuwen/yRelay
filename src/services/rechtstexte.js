// Rechtstexte (Datenschutz, Impressum) – vom Betreiber in den Admin-Einstellungen hinterlegt.
// Jeder Text ist entweder ein externer Link ODER ein eigener Text (Markdown/Plaintext).
// Gespeichert wird im bestehenden settings-Key-Value-Speicher, eine Migration ist nicht nötig.
const { getSetting, setSetting } = require('../db');

const ARTEN = {
  datenschutz: 'Datenschutz',
  impressum: 'Impressum',
};
const MODI = ['keine', 'url', 'text'];
const MAX_URL_LAENGE = 2000;
const MAX_TEXT_LAENGE = 100000;

function istArt(art) {
  return Object.prototype.hasOwnProperty.call(ARTEN, art);
}

function schluessel(art, feld) {
  return `rechtstext_${art}_${feld}`;
}

// Nur http(s)-Adressen zulassen (kein javascript:, data: usw.)
function pruefeUrl(wert) {
  const url = String(wert || '').trim();
  if (!url || url.length > MAX_URL_LAENGE) return null;
  try {
    const geparst = new URL(url);
    if (geparst.protocol !== 'https:' && geparst.protocol !== 'http:') return null;
    return geparst.href;
  } catch {
    return null;
  }
}

function lesen(art) {
  if (!istArt(art)) return null;
  const modusRoh = getSetting(schluessel(art, 'modus'));
  const url = getSetting(schluessel(art, 'url')) || '';
  const text = getSetting(schluessel(art, 'text')) || '';
  let modus = MODI.includes(modusRoh) ? modusRoh : 'keine';
  // Unvollständige Einträge gelten als nicht hinterlegt
  if (modus === 'url' && !pruefeUrl(url)) modus = 'keine';
  if (modus === 'text' && !text.trim()) modus = 'keine';
  return { art, titel: ARTEN[art], modus, url, text };
}

// Validiert und speichert eine Art. Wirft Error mit .status = 400 bei ungültigen Eingaben.
function validieren(art, eingabe) {
  const fehler = (nachricht) => Object.assign(new Error(nachricht), { status: 400 });
  if (!istArt(art)) throw fehler('Unbekannter Rechtstext.');
  if (!eingabe || typeof eingabe !== 'object') throw fehler(`${ARTEN[art]}: Ungültige Angaben.`);
  const modus = eingabe.modus === undefined || eingabe.modus === '' ? 'keine' : eingabe.modus;
  if (!MODI.includes(modus)) throw fehler(`${ARTEN[art]}: Ungültige Art (erlaubt: keine, url, text).`);

  const urlRoh = eingabe.url == null ? '' : String(eingabe.url).trim();
  const text = eingabe.text == null ? '' : String(eingabe.text).replace(/\r\n?/g, '\n');
  if (text.length > MAX_TEXT_LAENGE) throw fehler(`${ARTEN[art]}: Der Text ist zu lang (max. ${MAX_TEXT_LAENGE} Zeichen).`);
  let url = '';
  if (urlRoh) {
    url = pruefeUrl(urlRoh);
    if (!url) throw fehler(`${ARTEN[art]}: Bitte eine gültige http(s)-Adresse angeben.`);
  }
  if (modus === 'url' && !url) throw fehler(`${ARTEN[art]}: Für einen externen Link wird eine Adresse benötigt.`);
  if (modus === 'text' && !text.trim()) throw fehler(`${ARTEN[art]}: Für einen eigenen Text wird Inhalt benötigt.`);
  return { modus, url, text };
}

function speichern(art, werte) {
  setSetting(schluessel(art, 'modus'), werte.modus);
  setSetting(schluessel(art, 'url'), werte.url);
  setSetting(schluessel(art, 'text'), werte.text);
}

// Öffentliche Übersicht: nur hinterlegte Texte, ohne Inhalt
function uebersicht() {
  const ergebnis = {};
  for (const art of Object.keys(ARTEN)) {
    const eintrag = lesen(art);
    if (eintrag.modus === 'url') ergebnis[art] = { titel: eintrag.titel, modus: 'url', url: pruefeUrl(eintrag.url) };
    if (eintrag.modus === 'text') ergebnis[art] = { titel: eintrag.titel, modus: 'text' };
  }
  return ergebnis;
}

// ─── Markdown → HTML (bewusst klein, XSS-sicher) ─────────────────────────────
// Alles wird zuerst maskiert; erzeugt werden nur <h2>–<h4>, <p>, <br>, <ul>/<ol>/<li>,
// <strong>, <em>, <code>, <hr> und <a> mit http(s)-, mailto:- oder tel:-Zielen.

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sicheresLinkZiel(ziel) {
  const z = String(ziel || '').trim();
  if (/^mailto:[^\s]+$/i.test(z) || /^tel:[+\d\s()/-]+$/i.test(z)) return z;
  return pruefeUrl(z);
}

function formatiere(maskiert) {
  return maskiert
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__([^_]+)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
}

function inline(text) {
  // Links [Text](Ziel) zuerst herauslösen, damit Ziele nie durch die Formatierung laufen
  const teile = [];
  const linkMuster = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let letzte = 0;
  let treffer;
  while ((treffer = linkMuster.exec(text)) !== null) {
    teile.push(formatiere(escapeHtml(text.slice(letzte, treffer.index))));
    const ziel = sicheresLinkZiel(treffer[2]);
    const beschriftung = formatiere(escapeHtml(treffer[1]));
    if (ziel) {
      const extern = /^https?:/i.test(ziel);
      teile.push(`<a href="${escapeHtml(ziel)}"${extern ? ' target="_blank" rel="noopener noreferrer"' : ''}>${beschriftung}</a>`);
    } else {
      teile.push(beschriftung);
    }
    letzte = treffer.index + treffer[0].length;
  }
  teile.push(formatiere(escapeHtml(text.slice(letzte))));
  return teile.join('');
}

function markdownZuHtml(quelle) {
  const zeilen = String(quelle || '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let absatz = [];
  let liste = null; // { typ: 'ul'|'ol', punkte: [] }

  const absatzSchliessen = () => {
    if (absatz.length) html.push(`<p>${absatz.map(inline).join('<br>')}</p>`);
    absatz = [];
  };
  const listeSchliessen = () => {
    if (liste) html.push(`<${liste.typ}>${liste.punkte.map(p => `<li>${inline(p)}</li>`).join('')}</${liste.typ}>`);
    liste = null;
  };

  for (const roh of zeilen) {
    const zeile = roh.replace(/\s+$/, '');
    if (!zeile.trim()) { absatzSchliessen(); listeSchliessen(); continue; }

    const ueberschrift = zeile.match(/^(#{1,6})\s+(.*)$/);
    if (ueberschrift) {
      absatzSchliessen(); listeSchliessen();
      const ebene = Math.min(4, ueberschrift[1].length + 1); // h1 ist der Seitentitel
      html.push(`<h${ebene}>${inline(ueberschrift[2])}</h${ebene}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(zeile)) {
      absatzSchliessen(); listeSchliessen();
      html.push('<hr>');
      continue;
    }
    const ungeordnet = zeile.match(/^\s*[-*+]\s+(.*)$/);
    const geordnet = zeile.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ungeordnet || geordnet) {
      absatzSchliessen();
      const typ = ungeordnet ? 'ul' : 'ol';
      if (liste && liste.typ !== typ) listeSchliessen();
      if (!liste) liste = { typ, punkte: [] };
      liste.punkte.push((ungeordnet || geordnet)[1]);
      continue;
    }
    listeSchliessen();
    absatz.push(zeile.trim());
  }
  absatzSchliessen();
  listeSchliessen();
  return html.join('\n');
}

module.exports = {
  ARTEN,
  MODI,
  istArt,
  lesen,
  validieren,
  speichern,
  uebersicht,
  markdownZuHtml,
  pruefeUrl,
};
