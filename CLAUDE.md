# CLAUDE.md – Hinweise für Arbeiten an yRelay

## Datenschutz und private Instanz

- Ruwens Instanz läuft als **private, nicht-kommerzielle Instanz** (Haushaltsausnahme, Art. 2 Abs. 2 lit. c DSGVO). Die Hinweisseite liegt unter `/#hinweis` (`public/js/views/hinweis.js`) und enthält zusätzlich vorsorgliche Datenschutzinformationen nach Art. 13 DSGVO. Grundlage und Fundstellen: `docs/PRIVAT-HINWEIS.md`.
- **Regel:** Wird das Projekt öffentlich oder für Fremde geöffnet (Registrierung, öffentliche Inhalte oder Teilen-Links, Nutzer außerhalb von Familie und engen Bekannten, kommerzieller Zweck) oder kommt ein neuer externer Dienst dazu (CDN, API, Analytics, Tracking, Push- oder KI-Anbieter), ist eine **vollständige Datenschutzerklärung** als eigene Seite nötig und ggf. ein **Impressum nach § 5 DDG**.
- Bei **jeder datenschutzrelevanten Änderung** (neue Daten, neue Empfänger, neue Speicher im Browser, geänderte Löschfristen, neue öffentliche Routen) `public/js/views/hinweis.js` (inklusive `stand`) und `docs/PRIVAT-HINWEIS.md` im selben Commit prüfen und anpassen.
- Externe Skripte, Schriften oder Stile nicht von CDNs laden, sondern selbst ausliefern.
- Die Hinweisseite nennt Ruwen als Verantwortlichen. Wer das öffentliche Docker-Image selbst betreibt, muss sie anpassen.
