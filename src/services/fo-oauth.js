// OAuth 2.1 für den FO-MCP (MCP-Autorisierung: Discovery, Dynamic Client Registration, PKCE)
const crypto = require('crypto');
const { db } = require('../db');

const offeneFlows = new Map(); // state -> { profilId, verifier, redirectUri, ablauf }
const FLOW_DAUER_MS = 10 * 60 * 1000;

async function holeJson(url, optionen) {
  const res = await fetch(url, optionen);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, json, text };
}

// Findet Authorization-Server-Metadaten zur MCP-URL
async function entdecke(mcpUrl) {
  const mcp = new URL(mcpUrl);
  let ressourceMeta = null;

  // 1. Hinweis aus der 401-Antwort des MCP-Servers
  try {
    const probe = await fetch(mcpUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: '{}' });
    const hinweis = /resource_metadata="([^"]+)"/.exec(probe.headers.get('www-authenticate') || '');
    if (hinweis) ressourceMeta = (await holeJson(hinweis[1])).json;
  } catch {}
  // 2. Well-known-Pfade
  if (!ressourceMeta) {
    for (const pfad of [`/.well-known/oauth-protected-resource${mcp.pathname === '/' ? '' : mcp.pathname}`, '/.well-known/oauth-protected-resource']) {
      const { res, json } = await holeJson(mcp.origin + pfad).catch(() => ({}));
      if (res?.ok && json) { ressourceMeta = json; break; }
    }
  }

  const asBasis = ressourceMeta?.authorization_servers?.[0] || mcp.origin;
  const as = new URL(asBasis);
  const pfadSuffix = as.pathname === '/' ? '' : as.pathname;
  for (const pfad of [`/.well-known/oauth-authorization-server${pfadSuffix}`, `/.well-known/openid-configuration${pfadSuffix}`]) {
    const { res, json } = await holeJson(as.origin + pfad).catch(() => ({}));
    if (res?.ok && json?.authorization_endpoint && json?.token_endpoint) {
      return { meta: json, scopes: ressourceMeta?.scopes_supported || json.scopes_supported || null };
    }
  }
  throw new Error('Keine OAuth-Konfiguration beim FO-MCP gefunden. Ist die MCP-URL korrekt?');
}

function ladeOauth(profil) {
  try { return profil.oauth_json ? JSON.parse(profil.oauth_json) : {}; } catch { return {}; }
}

function speichereOauth(profilId, daten) {
  db.prepare('UPDATE poke_profiles SET oauth_json = ? WHERE id = ?').run(JSON.stringify(daten), profilId);
}

/** Startet die Autorisierung und liefert die URL, die der Admin im Browser öffnen muss. */
async function starteAutorisierung(profil, appUrl) {
  const redirectUri = `${appUrl}/api/webhooks/fo-oauth/callback`;
  const { meta, scopes } = await entdecke(profil.webhook_url);
  let oauth = ladeOauth(profil);

  // Client nur neu registrieren, wenn Server oder Redirect-URI wechselten
  if (!oauth.client_id || oauth.token_endpoint !== meta.token_endpoint || oauth.redirect_uri !== redirectUri) {
    if (!meta.registration_endpoint) throw new Error('Der FO-MCP unterstützt keine automatische Client-Registrierung.');
    const { res, json, text } = await holeJson(meta.registration_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'yRelay',
        redirect_uris: [redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });
    if (!res.ok || !json?.client_id) throw new Error(`Client-Registrierung bei FO fehlgeschlagen (${res.status}): ${text.slice(0, 200)}`);
    oauth = { client_id: json.client_id, token_endpoint: meta.token_endpoint, redirect_uri: redirectUri };
  }

  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(24).toString('hex');
  for (const [k, v] of offeneFlows) if (v.ablauf < Date.now()) offeneFlows.delete(k);
  offeneFlows.set(state, { profilId: profil.id, verifier, ablauf: Date.now() + FLOW_DAUER_MS });
  speichereOauth(profil.id, { ...oauth, access_token: oauth.access_token, refresh_token: oauth.refresh_token, expires_at: oauth.expires_at });

  const url = new URL(meta.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', oauth.client_id);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('resource', profil.webhook_url);
  if (Array.isArray(scopes) && scopes.length) url.searchParams.set('scope', scopes.join(' '));
  return url.toString();
}

async function tokenAnfrage(tokenEndpoint, parameter) {
  const { res, json, text } = await holeJson(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams(parameter).toString(),
  });
  if (!res.ok || !json?.access_token) throw new Error(`Token-Anfrage bei FO fehlgeschlagen (${res.status}): ${text.slice(0, 200)}`);
  return json;
}

function tokenDaten(oauth, antwort) {
  return {
    ...oauth,
    access_token: antwort.access_token,
    refresh_token: antwort.refresh_token || oauth.refresh_token,
    expires_at: antwort.expires_in ? Date.now() + Number(antwort.expires_in) * 1000 : null,
    verbunden_am: oauth.verbunden_am || new Date().toISOString(),
  };
}

/** Schließt den Flow nach dem Redirect von FO ab und speichert die Tokens. */
async function schliesseAutorisierungAb(state, code) {
  const flow = offeneFlows.get(state);
  if (!flow || flow.ablauf < Date.now()) throw new Error('Die Autorisierung ist abgelaufen oder ungültig. Bitte erneut starten.');
  offeneFlows.delete(state);
  const profil = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(flow.profilId);
  if (!profil) throw new Error('Das Agent-Profil existiert nicht mehr.');
  const oauth = ladeOauth(profil);
  const antwort = await tokenAnfrage(oauth.token_endpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauth.redirect_uri,
    client_id: oauth.client_id,
    code_verifier: flow.verifier,
    resource: profil.webhook_url,
  });
  speichereOauth(profil.id, tokenDaten(oauth, antwort));
  return profil;
}

/** Liefert ein gültiges Access-Token (erneuert es bei Bedarf) oder null, wenn kein OAuth eingerichtet ist. */
async function holeZugangstoken(profil, erzwingeErneuerung = false) {
  // Immer frisch aus der DB lesen: Aufrufer übergeben teils unvollständige Profil-Objekte
  if (profil.id) profil = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(profil.id) || profil;
  const oauth = ladeOauth(profil);
  if (!oauth.access_token && !oauth.refresh_token) return null;
  const laeuftAb = oauth.expires_at && oauth.expires_at - Date.now() < 60 * 1000;
  if (!erzwingeErneuerung && !laeuftAb && oauth.access_token) return oauth.access_token;
  if (!oauth.refresh_token) {
    if (!erzwingeErneuerung && oauth.access_token) return oauth.access_token;
    throw new Error('Die FO-Verbindung ist abgelaufen. Bitte im Admin-Panel unter KI-Agenten neu mit FO verbinden.');
  }
  try {
    const antwort = await tokenAnfrage(oauth.token_endpoint, {
      grant_type: 'refresh_token',
      refresh_token: oauth.refresh_token,
      client_id: oauth.client_id,
      resource: profil.webhook_url,
    });
    const neu = tokenDaten(oauth, antwort);
    speichereOauth(profil.id, neu);
    return neu.access_token;
  } catch (err) {
    throw new Error(`Die FO-Verbindung konnte nicht erneuert werden – bitte im Admin-Panel neu mit FO verbinden. (${err.message})`);
  }
}

function istVerbunden(profil) {
  const oauth = ladeOauth(profil);
  return !!(oauth.access_token || oauth.refresh_token);
}

module.exports = { starteAutorisierung, schliesseAutorisierungAb, holeZugangstoken, istVerbunden };
