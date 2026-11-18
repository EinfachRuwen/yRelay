# yRelay

<div align="center">

![yRelay](https://img.shields.io/badge/yRelay-Messaging%20Portal-0e518d?style=for-the-badge)

**Sicheres Messaging-Portal für KI-Agenten**

[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?style=flat-square&logo=docker)](https://ghcr.io/einfachruwen/yrelay)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/EinfachRuwen/yRelay/docker-publish.yml?style=flat-square&label=CI%2FCD)](https://github.com/EinfachRuwen/yRelay/actions)
[![License](https://img.shields.io/badge/Lizenz-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Was ist yRelay?

**yRelay** ist ein selbst gehostetes Web-Portal, über das eingeladene Nutzer Nachrichten an einen oder mehrere KI-Agenten senden können. Poke wird weiterhin unterstützt; weitere Agenten lassen sich im Admin-Panel konfigurieren.

### Features

- 🔐 **Login-System** - JWT-basierte Authentifizierung
- 👥 **Nutzer-Verwaltung** - Admin kann Nutzer erstellen oder per E-Mail einladen
- 💬 **Freie Nachrichten** - Beliebige Textnachrichten an zugewiesene KI-Agenten senden
- 🤖 **Agentenprofile** - Zustellung per Webhook oder SMTP-E-Mail, Antworten per API oder geschützter Webseite
- 🔔 **Benachrichtigungskanäle** - Nutzer kombinieren E-Mail, ntfy und Pushover individuell
- 🚨 **Notfallbenachrichtigung** - Vorgefertigte Vorlage mit Prioritätsauswahl (Hohe Priorität / Notfall)
- 📋 **Nachrichten-Übersicht** - Admin sieht alle gesendeten Nachrichten
- ⚙️ **Einstellungen** - Webhook, SMTP und Pushover im Admin-Panel konfigurierbar
- 🐳 **Docker-ready** - Fertig für Cosmos Cloud und andere Docker-Hosts

---

## Schnellstart mit Docker Compose

### 1. Docker Compose herunterladen

```bash
curl -O https://raw.githubusercontent.com/EinfachRuwen/yRelay/main/docker-compose.yml
```

### 2. Konfiguration anpassen

Öffne `docker-compose.yml` und passe die Umgebungsvariablen an:

```yaml
environment:
  JWT_SECRET: "langer-zufaelliger-string"      # Unbedingt ändern!
  ADMIN_USERNAME: "admin"
  ADMIN_EMAIL: "admin@example.com"
  ADMIN_PASSWORD: "sicheres-passwort"
  POKE_WEBHOOK_URL: "https://poke.com/api/v1/inbound/api-message"
  POKE_API_KEY: "dein-poke-v2-api-key"
  PUSHOVER_APP_TOKEN: "dein-pushover-application-token" # Optional; alternativ im Admin-Panel eintragen
  APP_URL: "https://yrelay.deinedomain.de"
  OWNER_NAME: "Alex"                                    # Wer die Nachrichten bekommt
```

### 3. Starten

```bash
docker compose up -d
```

Der Admin-Nutzer wird beim ersten Start automatisch erstellt.

---

## Für Cosmos Cloud

yRelay ist speziell für Cosmos Cloud optimiert - kein Port-Expose notwendig. Lade einfach die `docker-compose.yml` in das Cosmos-Dashboard und starte den Container.

Cosmos Cloud routet den Traffic automatisch über sein internes Proxy-System.

---

## Konfigurationsreferenz

| Variable | Beschreibung | Standard |
|---|---|---|
| `JWT_SECRET` | Geheimer Schlüssel für JWT-Token | - |
| `ADMIN_USERNAME` | Benutzername des initialen Admins | `admin` |
| `ADMIN_EMAIL` | E-Mail des initialen Admins | - |
| `ADMIN_PASSWORD` | Passwort des initialen Admins | `Admin1234!` |
| `POKE_WEBHOOK_URL` | Poke API-Endpunkt | `https://poke.com/api/v1/inbound/api-message` |
| `POKE_API_KEY` | Poke V2 API Key | - |
| `PUSHOVER_APP_TOKEN` | Pushover Application API Token (optional) | - |
| `SMTP_HOST` | SMTP-Server (optional) | - |
| `SMTP_PORT` | SMTP-Port | `587` |
| `SMTP_USER` | SMTP-Benutzername | - |
| `SMTP_PASS` | SMTP-Passwort | - |
| `SMTP_FROM` | Absender-E-Mail-Adresse | - |
| `APP_URL` | Öffentliche URL für Einladungslinks | `http://localhost:3000` |
| `OWNER_NAME` | Name des Empfängers, erscheint in der Oberfläche („Nachricht an …“). Auch im Admin-Panel unter Einstellungen änderbar | Name des Admin-Kontos |
| `PORT` | Interner App-Port | `3000` |

---

Im Admin-Panel unter **KI-Agenten** lassen sich Agenten per Webhook oder E-Mail anlegen. Bei Webhooks bleibt die Poke-API mit `Authorization: Bearer …` und dem JSON-Feld `message` kompatibel. Für E-Mail-Agenten muss SMTP eingerichtet sein. Nutzer tragen ihren persönlichen Pushover User-Key im Profil ein und wählen dort ihre Benachrichtigungskanäle.

### FO über MCP

Im Admin-Panel kann ein Agent mit der Zustellung **FO über MCP** angelegt werden. Es genügt die MCP-URL; die Anmeldung läuft über OAuth (Discovery, automatische Client-Registrierung, PKCE): In der Agenten-Kachel auf **Mit FO verbinden** klicken, bei FO freigeben, fertig. yRelay erneuert die Tokens selbstständig. Die Redirect-URI ist `<APP_URL>/api/webhooks/fo-oauth/callback` (die `app_url` in den Einstellungen muss stimmen). Ein statisches Bearer-Token ist als Alternative möglich. yRelay arbeitet dann als MCP-Client: Die Nachricht geht per `ask_fo` an FO, die Antwort wird per `get_fo_reply` abgeholt und automatisch wie eine normale Agenten-Antwort gespeichert (Dashboard, Mail, Push). Weil der MCP-Zugang als dein eigener FO-Account gilt, behandelt FO solche Anfragen als vertrauenswürdig. yRelay kennzeichnet den Nachrichtentext deshalb ausdrücklich als Text eines Dritten, damit externe Absender FO keine Aktionen in deinem Namen auslösen können. Einschränkung: Strukturierte Callbacks (Spielzüge, Schul-Dashboard-Daten) benötigen weiterhin Webhook- oder Webseiten-Zugriff.

## Datenschutz & Rechtstexte (für Betreiber)

yRelay ist Software zum Selbsthosten. **Wer eine Instanz betreibt, ist dafür selbst verantwortlich** – auch für Datenschutzerklärung und ggf. Impressum. Das Projekt liefert keine fertigen Rechtstexte mit.

- **Rechtstexte hinterlegen:** Verwaltung → Einstellungen → *Rechtstexte*. Für „Datenschutz“ und „Impressum“ jeweils entweder eine externe Adresse (http/https) oder einen eigenen Text (Markdown oder reiner Text; HTML wird nicht ausgeführt). Hinterlegte Texte erscheinen als Links auf der Anmeldeseite, bei Einladung und Passwort-Reset sowie im Nutzermenü; eigene Texte unter `#datenschutz` bzw. `#impressum`. Ohne Eintrag wird nichts angezeigt.
- **Keine Indexierung:** `robots.txt` (Disallow), `<meta name="robots" content="noindex, nofollow">` und Header `X-Robots-Tag: noindex, nofollow`.
- **Keine externen Ressourcen im Browser:** Schriften, Icons, Quill (E-Mail-Editor, nur in der Verwaltung geladen) und canvas-confetti werden von der eigenen Instanz ausgeliefert (`/vendor/…`, inkl. Lizenzdateien unter `/vendor/<paket>/LICENSE`).

### Externe Dienste (je nach Konfiguration)

Der **Server** spricht – nur wenn das jeweilige Feature eingerichtet ist – mit diesen Diensten. Was davon bei dir aktiv ist, gehört in deine Datenschutzerklärung:

| Dienst | Wann | Was übertragen wird |
|---|---|---|
| **Poke** (`poke.com`) bzw. andere Agenten-Webhooks | KI-Agent per Webhook konfiguriert | Nachrichtentext, Absender-Name und -E-Mail, Typ/Priorität, Antwort-Links |
| **FO über MCP** (vom Betreiber angegebene MCP-URL) | Agent mit Zustellung „FO über MCP“ | Nachrichtentext und Absenderangaben, OAuth-Tokens |
| **E-Mail-Agent / SMTP-Anbieter** | SMTP eingerichtet | Einladungen, Passwort-Reset, Benachrichtigungen, manuelle Mails, Nachrichten an E-Mail-Agenten (Empfängeradresse, Inhalt) |
| **Deepgram** (`api.deepgram.com`) | Deepgram-API-Key gesetzt und Spracheingabe genutzt | Sprachaufnahme zur Transkription |
| **Pushover** (`api.pushover.net`) | App-Token gesetzt und Nutzer hat Pushover gewählt | Benachrichtigungstext, Pushover-User-Key |
| **ntfy** (`ntfy.sh`, öffentlicher Server) | Nutzer hat ein ntfy-Topic hinterlegt | Benachrichtigungstext an das Topic (wer das Topic kennt, kann mitlesen) |
| **OpenStreetMap Nominatim** (`nominatim.openstreetmap.org`) | Schul-Dashboard mit Wetter-Ort | Ortsname |
| **Bright Sky / DWD** (`api.brightsky.dev`) | Schul-Dashboard mit Wetter | Koordinaten des Orts |
| **VRR EFA** (`openservice-test.vrr.de`) | Schul-Dashboard mit Haltestellen/Fahrten | Haltestellen- und Ortsnamen |
| **Pingvin Share** (eigene URL) | Pingvin-Integration eingerichtet | Hochgeladene Dateien aus dem Schul-Chat |
| **Hosting / Reverse Proxy / CDN** (z. B. Cloudflare, Cosmos Cloud) | je nach deinem Setup | IP-Adressen, Anfragedaten, ggf. TLS-Terminierung |

**Gespeichert** werden lokal in SQLite (`data/`): Nutzerkonten (Benutzername, E-Mail, Passwort-Hash, Einstellungen wie ntfy-Topic/Pushover-Key), Nachrichten und Antworten, Spiel- und Schul-Dashboard-Daten, ein Audit-Protokoll von Admin-Aktionen sowie tägliche Backups unter `data/backups/`. Im Browser liegen Anmelde-Token und Design-Wahl im `localStorage`. Server-Logs (Konsole) können bei Fehlern IP-Adressen enthalten.

## Poke Payload-Format

Nachrichten an Poke werden weiterhin im offiziellen Poke API-Format gesendet:

```json
{
  "message": "[yRelay] Externe Nachricht von MaxMustermann (max@example.com):\n\n..."
}
```

Der vollständige Kontext (Absender-Name, E-Mail, Nachrichtentyp, Priorität) ist immer im `message`-Feld enthalten, damit Poke alle Informationen korrekt verarbeiten kann.

---

## Lokale Entwicklung

```bash
git clone https://github.com/EinfachRuwen/yRelay.git
cd yRelay
npm install
cp .env.example .env
# .env anpassen
npm run dev
```

---

## Docker Image

Das Image wird automatisch via GitHub Actions auf GHCR veröffentlicht:

```
ghcr.io/einfachruwen/yrelay:latest
```

Verfügbare Architekturen: `linux/amd64`, `linux/arm64`

---

## Lizenz

MIT
