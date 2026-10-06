const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yrelay-agent-page-'));
process.env.DB_PATH = path.join(tempDir, 'yrelay.db');
const { db } = require('../src/db');
const webhooksRouter = require('../src/routes/webhooks');

test('Agenten-Spielseite verbirgt ungetroffene Nutzerschiffe', () => {
  const user = db.prepare('INSERT INTO users (username) VALUES (?)').run('website-agent-test');
  const profile = db.prepare(`
    INSERT INTO poke_profiles (name, webhook_url, api_key, interface_mode, ist_standard)
    VALUES (?, ?, ?, 'website', 1)
  `).run('Website-Agent', 'https://example.test/hook', 'test-key');
  const state = {
    amZug: 'poke',
    phase: 'playing',
    nutzerFeld: [[1, 2, 3], [0, 1, 0]],
    pokeFeld: [[1, 0, 0], [0, 0, 0]],
  };
  const token = 'a'.repeat(40);
  const game = db.prepare(`
    INSERT INTO games (user_id, game_type, state, status, webhook_token, poke_profile_id)
    VALUES (?, 'battleship', ?, 'active', ?, ?)
  `).run(user.lastInsertRowid, JSON.stringify(state), token, profile.lastInsertRowid);

  let statusCode = 200;
  let html = '';
  const response = {
    status(code) { statusCode = code; return this; },
    type() { return this; },
    send(body) { html = body; return this; },
  };
  webhooksRouter.agentGamePage({ params: { gameId: String(game.lastInsertRowid), token } }, response);

  assert.equal(statusCode, 200);
  const encodedState = html.match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
  assert.ok(encodedState, 'Spielstand ist auf der Agenten-Webseite sichtbar');
  const renderedState = JSON.parse(encodedState
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'));
  assert.deepEqual(renderedState.nutzerFeld, [[0, 2, 3], [0, 0, 0]]);
  assert.deepEqual(JSON.parse(db.prepare('SELECT state FROM games WHERE id = ?').get(game.lastInsertRowid).state).nutzerFeld, state.nutzerFeld);
});

test('Akinator-Webseite verbirgt das Nutzer-Geheimwort auch ausserhalb des Agentenzugs', () => {
  const user = db.prepare('INSERT INTO users (username) VALUES (?)').run('akinator-website-agent-test');
  const profile = db.prepare(`
    INSERT INTO poke_profiles (name, webhook_url, api_key, interface_mode, ist_standard)
    VALUES (?, ?, ?, 'website', 0)
  `).run('Website-Agent-Akinator', 'https://example.test/hook', 'test-key');
  const state = {
    amZug: 'nutzer',
    phase: 'fragen',
    wort: 'geheimes Wort',
    wortGeber: 'nutzer',
    rater: 'poke',
    fragen: [],
  };
  const token = 'b'.repeat(40);
  const game = db.prepare(`
    INSERT INTO games (user_id, game_type, state, status, webhook_token, poke_profile_id)
    VALUES (?, 'akinator', ?, 'active', ?, ?)
  `).run(user.lastInsertRowid, JSON.stringify(state), token, profile.lastInsertRowid);

  let html = '';
  const response = {
    status() { return this; },
    type() { return this; },
    send(body) { html = body; return this; },
  };
  webhooksRouter.agentGamePage({ params: { gameId: String(game.lastInsertRowid), token } }, response);

  const encodedState = html.match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
  const renderedState = JSON.parse(encodedState
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'));
  assert.equal(Object.hasOwn(renderedState, 'wort'), false);
});

test.after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});