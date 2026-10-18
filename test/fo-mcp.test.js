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
