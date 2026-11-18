# Hinweise für Mitwirkende und KI-Assistenten

yRelay ist ein Open-Source-Projekt, das jeder selbst hosten kann. Betreiber einer Instanz sind selbst verantwortlich und hinterlegen ihre Rechtstexte in den Admin-Einstellungen (Rechtstexte).

## Regeln

- **Keine personenbezogenen Daten des Maintainers** (Klarname, Anschrift, E-Mail, Telefonnummer, Domains privater Instanzen) in Code, Doku, Beispielen, Tests, Commits oder PR-Texten. Beispiele immer neutral halten (`Alex`, `example.org`, `deinedomain.de`).
- **Keine CDN- oder Fremd-Ressourcen im Frontend.** Schriften, Skripte, Styles und Bilder werden von der Instanz selbst ausgeliefert. Neue Bibliotheken als exakt gepinnte npm-Abhängigkeit einbinden und über `/vendor/<paket>/` (siehe `src/server.js`) inkl. Lizenzdatei ausliefern, nur dort laden, wo sie gebraucht werden.
- **Bei datenschutzrelevanten Änderungen** – neue externe Dienste oder serverseitige Requests, neue gespeicherte Daten (Datenbank, Backups, `localStorage`/Cookies), zusätzliche Logs, neue Übermittlungen an Agenten – den Abschnitt „Datenschutz & Rechtstexte (für Betreiber)“ in der `README.md` aktualisieren (Dienstliste und „Gespeichert“), damit Betreiber ihre Erklärung anpassen können.
- Nutzereingaben, die als HTML ausgegeben werden, immer maskieren (`UI.escapeHtml` im Frontend; Rechtstexte über `src/services/rechtstexte.js`). Links nur mit http(s)-, mailto:- oder tel:-Zielen erzeugen.
- Suchmaschinen-Sperre (`robots.txt`, Meta-Tag `robots`, Header `X-Robots-Tag`) nicht entfernen.

## Entwicklung

- `npm install`, `npm start` (Port 3000), Tests mit `npm test` (`node --test`).
- Einstellungen liegen im Key-Value-Speicher `settings` (`getSetting`/`setSetting` in `src/db.js`); Admin-Routen mit `requireAdmin` schützen.
