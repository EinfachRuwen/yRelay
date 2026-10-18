const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-fo-mcp-'));
process.env.DB_PATH = path.join(tempDir, 'yrelay.db');
const { db } = require('../src/db');
const { sendeFreieNachricht } = require('../src/services/poke');

function starteMockMcp() {
  const aufrufe = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const rpc = JSON.parse(body);
      aufrufe.push({ method: rpc.method, auth: req.headers.authorization, session: req.headers['mcp-session-id'], args: rpc.params?.arguments, name: rpc.params?.name });
      if (rpc.id === undefined) { res.writeHead(202); return res.end(); }
      const antwort = result => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Mcp-Session-Id': 'sess-1' });
        res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result })}\n\n`);
      };
      const tool = daten => antwort({ content: [{ type: 'text', text: JSON.stringify(daten) }] });
      if (rpc.method === 'initialize') return antwort({ protocolVersion: '2025-03-26', capabilities: {}, serverInfo: { name: 'mock' } });
      if (rpc.params.name === 'ask_fo') return tool({ status: 'working', progress: 'Fo arbeitet', conversationId: 'c1' });
      if (rpc.params.name === 'get_fo_reply') return tool({ status: 'complete', reply: 'Erledigt, Termin ist eingetragen.' });
      res.writeHead(404); res.end();
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, aufrufe, url: `http://127.0.0.1:${server.address().port}/mcp` })));
}

test('FO-MCP: Nachricht wird per ask_fo gesendet und die Antwort automatisch gespeichert', async () => {
  const mock = await starteMockMcp();
  try {
    const user = db.prepare('INSERT INTO users (username, email) VALUES (?, ?)').run('fo-test', 'fo@example.test');
    const profil = db.prepare(`
      INSERT INTO poke_profiles (name, webhook_url, api_key, transport, ist_standard)
      VALUES ('FO', ?, 'mcp-token', 'fo_mcp', 1)
    `).run(mock.url);
    const msg = db.prepare(`
      INSERT INTO messages (user_id, type, content, poke_payload, status, reply_token, poke_profile_id)
      VALUES (?, 'free', 'Kannst du morgen einen Termin eintragen?', '', 'wird_gesendet', ?, ?)
    `).run(user.lastInsertRowid, 'b'.repeat(32), profil.lastInsertRowid);
    const agent = db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(profil.lastInsertRowid);

    const ergebnis = await sendeFreieNachricht({ username: 'fo-test', email: 'fo@example.test' }, 'Kannst du morgen einen Termin eintragen?', msg.lastInsertRowid, 'b'.repeat(32), agent);
    assert.equal(ergebnis.erfolg, true);

    for (let i = 0; i < 50; i++) {
      const zeile = db.prepare('SELECT reply_content FROM messages WHERE id = ?').get(msg.lastInsertRowid);
      if (zeile.reply_content) break;
      await new Promise(r => setTimeout(r, 100));
    }
    const zeile = db.prepare('SELECT reply_content FROM messages WHERE id = ?').get(msg.lastInsertRowid);
    assert.equal(JSON.parse(zeile.reply_content)[0].text, 'Erledigt, Termin ist eingetragen.');

    const methoden = mock.aufrufe.map(a => a.name || a.method);
    assert.deepEqual(methoden, ['initialize', 'notifications/initialized', 'ask_fo', 'get_fo_reply']);
    assert.ok(mock.aufrufe.every(a => a.auth === 'Bearer mcp-token'));
    assert.equal(mock.aufrufe[2].session, 'sess-1');
    const gesendet = mock.aufrufe[2].args.message;
    assert.match(gesendet, /NICHT von deinem Besitzer/);
    assert.match(gesendet, /Kannst du morgen einen Termin eintragen\?/);
    assert.equal(mock.aufrufe[3].args.conversationId, 'c1');
  } finally {
    mock.server.close();
  }
});

test('FO-MCP OAuth: Discovery, Registrierung, PKCE, Token-Abruf und Refresh', async () => {
  const { starteAutorisierung, schliesseAutorisierungAb, istVerbunden } = require('../src/services/fo-oauth');
  const { frageFo } = require('../src/services/fo-mcp');
  const crypto = require('node:crypto');
  const log = { registriert: 0, tokenAnfragen: [], challenge: null };
  let basis;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const json = (obj, status = 200, h = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(obj)); };
      if (req.url.startsWith('/.well-known/oauth-protected-resource')) return json({ resource: basis + '/mcp', authorization_servers: [basis] });
      if (req.url.startsWith('/.well-known/oauth-authorization-server')) return json({ authorization_endpoint: basis + '/authorize', token_endpoint: basis + '/token', registration_endpoint: basis + '/register' });
      if (req.url === '/register') { log.registriert++; return json({ client_id: 'client-1' }, 201); }
      if (req.url === '/token') {
        const p = new URLSearchParams(body);
        log.tokenAnfragen.push(Object.fromEntries(p));
        if (p.get('grant_type') === 'authorization_code') {
          const ok = crypto.createHash('sha256').update(p.get('code_verifier')).digest('base64url') === log.challenge;
          return ok ? json({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 }) : json({ error: 'invalid_grant' }, 400);
        }
        return json({ access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600 });
      }
      if (req.url === '/mcp') {
        const auth = req.headers.authorization;
        if (auth !== 'Bearer at-1' && auth !== 'Bearer at-2') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': `Bearer resource_metadata="${basis}/.well-known/oauth-protected-resource"` });
        const rpc = JSON.parse(body);
        if (rpc.id === undefined) { res.writeHead(202); return res.end(); }
        const antwort = result => json({ jsonrpc: '2.0', id: rpc.id, result });
        if (rpc.method === 'initialize') return antwort({ protocolVersion: '2025-03-26', capabilities: {} });
        return antwort({ content: [{ type: 'text', text: JSON.stringify({ status: 'complete', reply: `ok mit ${auth}` }) }] });
      }
      res.writeHead(404); res.end();
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  basis = `http://127.0.0.1:${server.address().port}`;
  try {
    const profil = db.prepare(`INSERT INTO poke_profiles (name, webhook_url, api_key, transport) VALUES ('FO-OAuth', ?, '', 'fo_mcp')`).run(basis + '/mcp');
    const zeile = () => db.prepare('SELECT * FROM poke_profiles WHERE id = ?').get(profil.lastInsertRowid);

    const authUrl = new URL(await starteAutorisierung(zeile(), 'https://yrelay.example'));
    assert.equal(authUrl.origin + authUrl.pathname, basis + '/authorize');
    assert.equal(authUrl.searchParams.get('client_id'), 'client-1');
    assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(authUrl.searchParams.get('redirect_uri'), 'https://yrelay.example/api/webhooks/fo-oauth/callback');
    log.challenge = authUrl.searchParams.get('code_challenge');

    await assert.rejects(() => schliesseAutorisierungAb('falscher-state', 'x'), /abgelaufen|ungültig/);
    await schliesseAutorisierungAb(authUrl.searchParams.get('state'), 'code-1');
    assert.equal(istVerbunden(zeile()), true);
    assert.equal(log.registriert, 1);

    assert.equal((await frageFo(zeile(), 'Hallo')).antwort, 'ok mit Bearer at-1');

    // Token abgelaufen -> Refresh
    const oauth = JSON.parse(zeile().oauth_json);
    db.prepare('UPDATE poke_profiles SET oauth_json = ? WHERE id = ?').run(JSON.stringify({ ...oauth, expires_at: Date.now() - 1000 }), profil.lastInsertRowid);
    assert.equal((await frageFo(zeile(), 'Hallo')).antwort, 'ok mit Bearer at-2');
    assert.equal(log.tokenAnfragen.at(-1).grant_type, 'refresh_token');
    assert.equal(JSON.parse(zeile().oauth_json).refresh_token, 'rt-2');
  } finally {
    server.close();
  }
});

test('FO-MCP: Fließtext-Zwischenstände sind keine Antwort und Anfragen laufen nacheinander', async () => {
  const { frageFo } = require('../src/services/fo-mcp');
  const ereignisse = [];
  let offen = 0, polls = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const rpc = JSON.parse(body);
      if (rpc.id === undefined) { res.writeHead(202); return res.end(); }
      const text = t => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { content: [{ type: 'text', text: t }] } })); };
      if (rpc.method === 'initialize') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: {} })); }
      if (rpc.params.name === 'ask_fo') {
        offen++;
        ereignisse.push(`ask:${rpc.params.arguments.message}:offen=${offen}`);
        return text('Working for 40s: reviewing a relayed message, 5 steps so far. Fo is still working on this. Call get_fo_reply now; it waits up to 40 seconds.');
      }
      polls++;
      if (polls % 3 !== 0) return text('Fo folded this message into the task it is already working on in this conversation. Call get_fo_reply now; it waits up to 40 seconds for Fo to finish.');
      offen--;
      return text(`Fertig (${polls}).`);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const agent = { id: 9001, name: 'FO', webhook_url: `http://127.0.0.1:${server.address().port}/mcp`, api_key: '' };
  try {
    const [a, b] = await Promise.all([
      frageFo(agent, 'eins', { pollSekunden: 0 }),
      frageFo(agent, 'zwei', { pollSekunden: 0 }),
    ]);
    assert.equal(a.antwort, 'Fertig (3).');
    assert.equal(b.antwort, 'Fertig (6).');
    assert.deepEqual(ereignisse, ['ask:eins:offen=1', 'ask:zwei:offen=1']);
  } finally {
    server.close();
  }
});
