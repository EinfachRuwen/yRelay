# yRelay

<div align="center">

![yRelay Logo](https://img.shields.io/badge/yRelay-Messaging%20Portal-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzYzNjZmMSIvPjx0ZXh0IHk9Ii45ZW0iIGZvbnQtc2l6ZT0iNjAiIHg9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC13ZWlnaHQ9ImJvbGQiPnk8L3RleHQ+PC9zdmc+)

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
| `PORT` | Interner App-Port | `3000` |

---

Im Admin-Panel unter **KI-Agenten** lassen sich Agenten per Webhook oder E-Mail anlegen. Bei Webhooks bleibt die Poke-API mit `Authorization: Bearer …` und dem JSON-Feld `message` kompatibel. Für E-Mail-Agenten muss SMTP eingerichtet sein. Nutzer tragen ihren persönlichen Pushover User-Key im Profil ein und wählen dort ihre Benachrichtigungskanäle.

### FO über MCP

Im Admin-Panel kann ein Agent mit der Zustellung **FO über MCP** angelegt werden. Es genügt die MCP-URL; die Anmeldung läuft über OAuth (Discovery, automatische Client-Registrierung, PKCE): In der Agenten-Kachel auf **Mit FO verbinden** klicken, bei FO freigeben, fertig. yRelay erneuert die Tokens selbstständig. Die Redirect-URI ist `<APP_URL>/api/webhooks/fo-oauth/callback` (die `app_url` in den Einstellungen muss stimmen). Ein statisches Bearer-Token ist als Alternative möglich. yRelay arbeitet dann als MCP-Client: Die Nachricht geht per `ask_fo` an FO, die Antwort wird per `get_fo_reply` abgeholt und automatisch wie eine normale Agenten-Antwort gespeichert (Dashboard, Mail, Push). Weil der MCP-Zugang als dein eigener FO-Account gilt, behandelt FO solche Anfragen als vertrauenswürdig. yRelay kennzeichnet den Nachrichtentext deshalb ausdrücklich als Text eines Dritten, damit externe Absender FO keine Aktionen in deinem Namen auslösen können. Einschränkung: Strukturierte Callbacks (Spielzüge, Schul-Dashboard-Daten) benötigen weiterhin Webhook- oder Webseiten-Zugriff.

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
