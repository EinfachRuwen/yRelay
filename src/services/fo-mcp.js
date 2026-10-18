// FO-MCP-Client für yRelay
// yRelay spricht als MCP-Client (Streamable HTTP, JSON-RPC) mit dem FO-MCP-Server:
// ask_fo übergibt die Aufgabe, get_fo_reply holt die Antwort ab. Die Antwort wird
// automatisch wie eine normale Agenten-Antwort in yRelay gespeichert.
const MCP_PROTOKOLL = '2025-03-26';
const POLL_WARTEZEIT_S = 40;
const MAX_WARTEZEIT_MS = 15 * 60 * 1000;

function parseRpcAntwort(text, contentType) {
  if (/text\/event-stream/i.test(contentType || '')) {
    const daten = text.split('\n').filter(z => z.startsWith('data:')).map(z => z.slice(5).trim());
    for (const eintrag of daten.reverse()) {
      try { const j = JSON.parse(eintrag); if (j.result !== undefined || j.error) return j; } catch {}
    }
    return null;
  }
  try { return JSON.parse(text); } catch { return null; }
}

class FoMcpClient {
  constructor(url, token) {
    this.url = url;
    this.token = token || '';
    this.sessionId = null;
    this.nextId = 1;
  }

  async rpc(method, params, istNotification = false) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': MCP_PROTOKOLL,
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const body = { jsonrpc: '2.0', method, params };
    if (!istNotification) body.id = this.nextId++;
    const res = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body) });
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;
    if (istNotification) return null;
    const text = await res.text();
    if (!res.ok) throw new Error(`FO-MCP antwortete mit Status ${res.status}: ${text.slice(0, 300)}`);
    const antwort = parseRpcAntwort(text, res.headers.get('content-type'));
    if (!antwort) throw new Error('FO-MCP lieferte keine gültige JSON-RPC-Antwort.');
    if (antwort.error) throw new Error(`FO-MCP-Fehler: ${antwort.error.message || JSON.stringify(antwort.error)}`);
    return antwort.result;
  }

  async verbinden() {
    await this.rpc('initialize', {
      protocolVersion: MCP_PROTOKOLL,
      capabilities: {},
      clientInfo: { name: 'yRelay', version: '1.0.0' },
    });
    await this.rpc('notifications/initialized', {}, true);
  }

  async tool(name, args) {
    const result = await this.rpc('tools/call', { name, arguments: args });
    const text = (result?.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    if (result?.isError) throw new Error(text || `FO-Tool ${name} meldete einen Fehler.`);
    let daten = null;
    try { daten = JSON.parse(text); } catch {}
    return { text, daten: daten && typeof daten === 'object' ? daten : null };
  }
}

// Normalisiert die Tool-Antwort von ask_fo / get_fo_reply
function lese(ergebnis) {
  const d = ergebnis.daten || {};
  const status = String(d.status || (ergebnis.daten ? 'complete' : 'complete')).toLowerCase();
  const antwort = d.reply ?? d.message ?? d.text ?? d.response ?? (ergebnis.daten ? '' : ergebnis.text);
  return {
    status,
    antwort: typeof antwort === 'string' ? antwort.trim() : JSON.stringify(antwort),
    progress: typeof d.progress === 'string' ? d.progress : '',
    conversationId: d.conversationId || null,
  };
}

/**
 * Übergibt eine Aufgabe an FO und wartet auf die Antwort.
 * @returns {{erfolg:boolean, antwort?:string, fehler?:string}}
 */
async function frageFo(agent, nachricht, { maxWartezeitMs = MAX_WARTEZEIT_MS, pollSekunden = POLL_WARTEZEIT_S } = {}) {
  const client = new FoMcpClient(agent.webhook_url, agent.api_key);
  await client.verbinden();
  let stand = lese(await client.tool('ask_fo', { message: nachricht }));
  const start = Date.now();
  while (stand.status === 'working') {
    if (Date.now() - start > maxWartezeitMs) {
      return { erfolg: false, fehler: 'FO hat nicht innerhalb der Wartezeit geantwortet (arbeitet evtl. weiter).' };
    }
    const args = { waitSeconds: pollSekunden };
    if (stand.conversationId) args.conversationId = stand.conversationId;
    const naechster = lese(await client.tool('get_fo_reply', args));
    stand = { ...naechster, conversationId: naechster.conversationId || stand.conversationId };
  }
  if (stand.status === 'failed') {
    return { erfolg: false, fehler: stand.antwort || stand.progress || 'FO meldete einen Fehler.' };
  }
  // complete oder Rückfrage von FO: beides wird dem Nutzer als Antwort angezeigt
  return { erfolg: true, antwort: stand.antwort || stand.progress };
}

module.exports = { frageFo, FoMcpClient };
