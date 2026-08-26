# ─── Build-Stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build-Tools für native Module (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Abhängigkeiten installieren (nur production)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─── Runtime-Stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Sicherheits-Updates
RUN apk update && apk upgrade --no-cache

# Nicht-root-Nutzer erstellen
RUN addgroup -g 1001 -S yrelay && \
    adduser -S -u 1001 -G yrelay yrelay

WORKDIR /app

# node_modules aus Builder kopieren
COPY --from=builder /app/node_modules ./node_modules

# App-Dateien kopieren
COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/

# Daten-Verzeichnis erstellen und Rechte setzen
RUN mkdir -p /app/data && chown -R yrelay:yrelay /app

# Als nicht-root-Nutzer laufen
USER yrelay

# Port deklarieren (intern, nicht expose für Cosmos Cloud)
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/gesundheit || exit 1

# App starten
CMD ["node", "src/server.js"]
