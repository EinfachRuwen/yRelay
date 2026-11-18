# Private Instanz – Datenschutz-Grundlage

Stand: 18. November 2026. Gilt für die von Ruwen Hohnholz betriebene Instanz (derzeit `https://yrelay.fcrw.cc`, ausgeliefert über Cloudflare und einen Cosmos-Server).

Die Hinweisseite liegt unter `/#hinweis` (`/hinweis` wird umgeleitet), Quelle: `public/js/views/hinweis.js`. Sie ist zweistufig:

1. **Private Instanz** – Hinweis auf die Haushaltsausnahme (Art. 2 Abs. 2 lit. c DSGVO), keine Impressumspflicht nach § 5 DDG, keine Nutzung durch Unbefugte.
2. **Vorsorglich: Datenschutzinformationen** – vollständige Information nach Art. 13 DSGVO für den Fall, dass die Ausnahme nicht greift.

## Warum (überhaupt) Haushaltsausnahme

- Nicht-kommerziell, keine Werbung, keine Einnahmen.
- Kein offener Zugang: Es gibt keine Registrierung. Konten legt nur der Admin an oder lädt per E-Mail ein (`src/routes/admin.js` `POST /nutzer`, `POST /nutzer/einladen`; Annahme nur mit Token in `src/routes/auth.js` `POST /einladung-annehmen`). Alle Nutzer-APIs verlangen ein JWT (`router.use(requireAuth)` in `messages.js`, `games.js`, `schuldashboard.js`; `requireAdmin` in `admin.js`).
- Zweck: persönliche Kommunikation mit Ruwen (über seinen KI-Agenten) für Familie und enge Bekannte.

Der EuGH legt die Ausnahme eng aus: Sie entfällt, sobald Daten einem **unbestimmten Personenkreis** zugänglich gemacht werden (C-101/01 *Lindqvist*) oder die Verarbeitung über den privaten Bereich hinausreicht (C-212/13 *Ryneš*). Für Anbieter der Mittel (Cloudflare, Poke usw.) gilt die DSGVO ohnehin (Erwägungsgrund 18).

## Gefundene Verarbeitungen (mit Fundstellen)

| Verarbeitung | Daten | Empfänger | Fundstelle |
|---|---|---|---|
| Auslieferung | IP, Zeitpunkt, URL, Browser | Cosmos-Reverse-Proxy, Cloudflare (USA; live per Header `server: cloudflare`, `report-to … a.nel.cloudflare.com`) | Live-Header von yrelay.fcrw.cc |
| Quill-Editor (für alle Besucher, auch vor Login) | IP, Browser | cdn.quilljs.com (über Cloudflare) | `public/index.html` Z. 26–27 |
| Konfetti (nach Login, bei Aktionen) | IP, Browser | cdn.jsdelivr.net | `public/js/views/dashboard.js` (canvas-confetti) |
| Konto | Benutzername, E-Mail, Anzeigename, Passwort-Hash, Tokens, Zeitstempel, ntfy-Topic, Pushover-Key | lokal SQLite | `src/db.js` Tabelle `users` |
| Audit-Log | Nutzer-ID, Aktion, Details (z. B. Benutzername, E-Mail, Betreff/Empfänger von Admin-Mails) | lokal, ohne Löschfrist; `ON DELETE SET NULL` | `src/db.js` `audit_logs`, `logAudit(...)` in `routes/*.js` |
| Nachrichten | Text, Typ, Priorität, Absendername/-E-Mail im Payload, Antworten | lokal; KI-Agent (Poke = The Interaction Company of California Inc., USA, oder Webhook/E-Mail/MCP-Agent, z. B. „FO") | `src/services/poke.js`, `src/services/fo-mcp.js`, `src/routes/messages.js` |
| Spracheingabe | Audioaufnahme | Deepgram, Inc. (USA) | `src/server.js` `/api/nachrichten/transkribieren` |
| E-Mail | Adresse, Inhalt | eingestellter SMTP-Server | `src/services/email.js` |
| ntfy | Titel/Text der Benachrichtigung, Klick-URL | ntfy.sh (öffentlich, Topic = einziger Schutz); Android/iOS-Zustellung teils via Google FCM | `src/services/ntfy.js`, `src/services/notify.js` |
| Pushover | User-Key, Titel/Text | Superblock, LLC (USA) | `src/services/notify.js` |
| Schul-Dashboard | Stundenplan, Termine, Aufgaben, Klausuren, Chat, Pings | lokal; Agent | `src/db.js` `schul_*`, `src/routes/webhooks.js` `/schul-update` |
| Wetter/ÖPNV | Ort / Haltestelle (keine IP der Nutzer) | Nominatim (OSMF), Bright Sky, VRR | `src/routes/schuldashboard.js`, `src/routes/webhooks.js` |
| Datei-Upload | Datei, Benutzername im Share-Namen | Pingvin Share (öffentlicher Link, 7 Tage) → Link an Agent | `src/routes/schuldashboard.js` `/upload` |
| Agent-Antwortseiten | Nachrichteninhalt | jeder mit Token-URL | `/agent/:id/:token` in `src/server.js` |
| Browser-Speicher | `yrelay_token`, `yrelay_offline_queue`, `yrelay_thema`, Service-Worker-Cache | Endgerät | `public/js/api.js`, `public/js/ui.js`, `public/sw.js` |
| Backups | ganze Datenbank | lokal, 15 neueste + pre_migration/pre_restore | `src/services/backup.js` |

Keine Analytics (kein Umami o. Ä.), keine Cookies durch yRelay, keine Registrierung. Bisher gab es im Code keine Datenschutz-/Impressumslinks.

## Was die Haushaltsausnahme gefährdet

1. **Drittanbieter-Einbindung für jeden Besucher:** Quill wird von `cdn.quilljs.com` geladen – auf jeder Seite, auch auf der Anmeldeseite, also auch für Fremde, die die öffentliche Adresse aufrufen. Das ist die typische Abmahn-Konstellation (vgl. LG München I, 20.01.2022, 3 O 17493/20, Google Fonts). Lösung: Quill lokal ausliefern (`public/vendor/`) und nur im Admin-Bereich laden; Konfetti ebenfalls lokal.
2. **Öffentlich erreichbare Inhalte per Link:** ntfy.sh-Topics sind öffentlich (wer den Topic-Namen errät, liest mit), Pingvin-Share-Links und `/agent/...`-Seiten sind für jeden mit Link abrufbar. Lösung: eigener ntfy-Server mit Zugriffsschutz oder nur neutrale Texte („Neue Antwort") an ntfy senden; Pingvin-Shares mit Passwort/kürzerer Laufzeit; Agent-Links kurz gültig halten.
3. **Weitergabe an kommerzielle KI-/Cloud-Dienste in den USA** (Poke, Deepgram, Pushover, Cloudflare). Poke behält sich laut eigener Datenschutzerklärung Modelltraining vor (außer im Modus „Maximum Privacy"). Die Inhalte eingeladener Personen verlassen damit den privaten Bereich. Lösung: Poke auf „Maximum Privacy" stellen, Auftragsverarbeitungs-/DPA-Bedingungen der Anbieter prüfen, Spracheingabe optional machen.
4. **Größe und Zusammensetzung des Nutzerkreises:** Labels, Broadcast-Mails und die Bezeichnung „Externe Nachricht" zeigen, dass die Software für einen größeren Kreis gebaut ist. Sobald Mitschüler, Vereins- oder Arbeitskontakte eingeladen werden, ist das kein „familiärer/persönlicher" Kreis mehr. Lösung: nur Familie und enge Freunde einladen; Nutzerliste regelmäßig prüfen.
5. **Öffentliche Erreichbarkeit der Instanz** (yrelay.fcrw.cc, indexierbar, `/api/konfiguration` gibt den Vornamen des Betreibers ohne Login aus). Zugang ist geschützt, aber jeder kann die Seite aufrufen. Lösung: `noindex` setzen bzw. `robots.txt` ausliefern, Instanz idealerweise hinter Cloudflare Access/VPN oder IP-Beschränkung.
6. **Unbefristete Speicherung** von Nachrichten und Audit-Log. Lösung: Löschfristen einführen (z. B. Nachrichten nach 12 Monaten, Audit-Log nach 90 Tagen).

## Bedingungen, unter denen die Ausnahme sicher wegfällt

- Registrierung oder Zugang für Personen, die Ruwen nicht persönlich kennt/eingeladen hat.
- Öffentliche Inhalte (öffentliche Teilen-Links, öffentliche Profile, Inhalte ohne Login).
- Kommerzieller Zweck (Werbung, Bezahlfunktionen, Einnahmen) oder Nutzung für Schule/Verein/Arbeit als Organisation.
- Neue externe Dienste oder Tracking/Analytics.

Dann ist eine vollständige Datenschutzerklärung als eigenständige Seite (nicht nur „vorsorglich") und ggf. ein Impressum nach § 5 DDG nötig.

## Offene Punkte für den Betreiber

- Server-Standort/Hoster des Cosmos-Servers: Bei angemietetem Server (VPS) muss der Hoster als Empfänger/Auftragsverarbeiter genannt werden.
- Welcher SMTP-Anbieter und welche Agenten (Poke, FO, …) in der Instanz aktiv sind – auf der Seite stehen sie derzeit als Kategorien.
- Protokoll-Aufbewahrung bei Cosmos-Proxy und Cloudflare.
- Die c/o-Anschrift (Autorenglück) ist als „ladungsfähige Anschrift" nach § 5 DDG umstritten; als Anschrift des Verantwortlichen nach Art. 13 ist sie in der Regel ausreichend.
- Die Seite nennt Ruwen fest im Code. Wer das öffentliche Docker-Image selbst betreibt, muss `public/js/views/hinweis.js` anpassen.
