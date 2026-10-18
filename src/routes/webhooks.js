const express = require('express');
const { db, logAudit } = require('../db');
const { sendeAntwortMail, sendeRueckfrageMail } = require('../services/email');

const router = express.Router();

const htmlEscapen = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function zeigeAgentAntwortseite(req, res) {
  const nachricht = db.prepare(`
    SELECT m.id, m.content, m.reply_content, p.name AS agent_name
    FROM messages m LEFT JOIN poke_profiles p ON p.id = m.poke_profile_id
    WHERE m.id = ? AND m.reply_token = ? AND p.interface_mode = 'website'
  `).get(req.params.id, req.params.token);
  if (!nachricht) return res.status(404).send('Dieser Antwortlink ist ungültig oder abgelaufen.');
  const agentName = htmlEscapen(nachricht.agent_name || 'KI-Agent');
  const content = htmlEscapen(nachricht.content);
  const alreadyReplied = Boolean(nachricht.reply_content);
  res.type('html').send(`<!doctype html>
<html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Antwort für ${agentName} · yRelay</title>
<style>body{margin:0;background:#101820;color:#edf2f4;font:16px system-ui,sans-serif}.page{max-width:680px;margin:48px auto;padding:24px}h1{font-size:24px}section,form{padding:20px 0;border-top:1px solid #35434c}article{white-space:pre-wrap;background:#1b2932;padding:16px;border-radius:8px;line-height:1.6}label{display:block;margin:16px 0 8px}textarea,select,input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #56636c;border-radius:6px;background:#17242c;color:inherit;font:inherit}textarea{min-height:150px;resize:vertical}button{margin-top:16px;padding:11px 18px;border:0;border-radius:6px;background:#2b9b87;color:white;font:inherit;font-weight:700;cursor:pointer}#status{min-height:24px;color:#8be0c2}</style>
<main class="page"><h1>Antwort an ${agentName}</h1><section><strong>Eingegangene Nachricht</strong><article>${content}</article></section>
<form id="reply"><label for="message">Deine Antwort</label><textarea id="message" required maxlength="5000"></textarea>
<label for="buttons-json">Rückfrage-Buttons als JSON (optional, maximal 5)</label><textarea id="buttons-json" placeholder='[{"id":"ja","text":"Ja","style":"primaer"}]' maxlength="3000"></textarea>
<label for="action">Status (optional)</label><select id="action"><option value="">Kein Status-Update</option><option value="erledigt">Erledigt</option><option value="in_bearbeitung">In Bearbeitung</option><option value="offen">Wieder offen</option><option value="pin">Anpinnen</option><option value="unpin">Pin entfernen</option></select>
<label for="note">Notiz zum Status (optional)</label><input id="note" maxlength="500">
<button type="submit">Antwort senden</button><p id="status" role="status">${alreadyReplied ? 'Eine vorherige Antwort ist bereits eingegangen.' : ''}</p></form></main>
<script>document.getElementById('reply').addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('status');const message=document.getElementById('message').value.trim();if(!message)return;try{const rawButtons=document.getElementById('buttons-json').value.trim();let buttons;if(rawButtons){buttons=JSON.parse(rawButtons);if(!Array.isArray(buttons)||buttons.length>5)throw new Error('Buttons müssen ein JSON-Array mit höchstens 5 Einträgen sein.')}const response=await fetch('/api/webhooks/agent-reply/${encodeURIComponent(req.params.id)}/${encodeURIComponent(req.params.token)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,buttons})});const data=await response.json();if(!response.ok)throw new Error(data.fehler||'Antwort fehlgeschlagen');const action=document.getElementById('action').value;if(action){const result=await fetch('/api/webhooks/poke-action/${encodeURIComponent(req.params.id)}/${encodeURIComponent(req.params.token)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,notiz:document.getElementById('note').value})});if(!result.ok)throw new Error('Antwort gespeichert, aber Status konnte nicht gesetzt werden.')}status.textContent='Antwort wurde übermittelt.';document.getElementById('message').value='';document.getElementById('buttons-json').value='';}catch(error){status.textContent=error.message;}});</script></html>`);
}

function agentSpielFelder(spieltyp, state) {
  if (spieltyp === 'connect4') return '<label>Spalte (0-6)<input name="spalte" type="number" min="0" max="6" required></label>';
  if (spieltyp === 'tictactoe') return '<label>Feld (0-8)<input name="feld" type="number" min="0" max="8" required></label>';
  if (spieltyp === 'battleship' && state.phase === 'setup_poke') {
    return '<label>Flottenaufstellung als JSON-Array<textarea name="setup" required placeholder=\'[{"name":"Schlachtschiff","x":0,"y":0,"horizontal":true}, ...]\'></textarea></label><p>1 Schlachtschiff, 2 Kreuzer, 3 Zerstörer und 4 U-Boote; x/y liegen zwischen 0 und 9.</p>';
  }
  if (spieltyp === 'battleship') return '<label>Reihe (0-9)<input name="reihe" type="number" min="0" max="9" required></label><label>Spalte (0-9)<input name="spalte" type="number" min="0" max="9" required></label>';
  if (spieltyp === 'ludo') return '<label>Figur (0-3)<input name="figur" type="number" min="0" max="3" required></label><p>Der Würfel wird beim Absenden geworfen. Wenn kein Zug möglich ist, zeigt die Seite das Ergebnis.</p>';
  if (spieltyp === 'wordgame') return '<label>Dein Wort<input name="wort" type="text" maxlength="80" required></label>';
  if (spieltyp === 'akinator' && state.phase === 'wort_auswahl') return '<label>Geheimes Wort<input name="wort" type="text" maxlength="100" required></label>';
  if (spieltyp === 'akinator' && state.phase === 'fragen' && state.amZug === state.rater) {
    return '<label>Aktion<select name="aktion"><option value="frage">Frage stellen</option><option value="loesen">Lösungswort raten</option><option value="tipp">Tipp anfordern</option></select></label><label>Frage oder Lösungswort<input name="frage" type="text" maxlength="300"></label><p>Bei „Tipp anfordern“ bleibt das Textfeld leer.</p>';
  }
  if (spieltyp === 'akinator' && state.phase === 'fragen') return '<label>Antwort auf die letzte Frage<input name="antwort" type="text" maxlength="120" required></label>';
  if (spieltyp === 'akinator' && state.phase === 'voting') return '<label>War die Lösung nah genug?<select name="zustimmung"><option value="true">Ja</option><option value="false">Nein</option></select></label>';
  return '<p>Für diesen Spielzustand ist kein Zugformular verfügbar.</p>';
}

function zeigeAgentSpielseite(req, res) {
  const game = db.prepare(`
    SELECT g.id, g.game_type, g.state, g.status, p.name AS agent_name
    FROM games g LEFT JOIN poke_profiles p ON p.id = g.poke_profile_id
    WHERE g.id = ? AND g.webhook_token = ? AND p.interface_mode = 'website'
  `).get(req.params.gameId, req.params.token);
  if (!game) return res.status(404).send('Dieser Spiel-Link ist ungültig oder abgelaufen.');
  let state;
  try { state = JSON.parse(game.state); } catch { return res.status(500).send('Der Spielstand ist ungültig.'); }
  const agentName = htmlEscapen(game.agent_name || 'KI-Agent');
  const isAkinatorRater = game.game_type === 'akinator' && state.amZug === state.rater;
  const safeState = { ...state };
  if (game.game_type === 'akinator' && state.wortGeber === 'nutzer') delete safeState.wort;
  if (game.game_type === 'battleship' && Array.isArray(state.nutzerFeld)) {
    safeState.nutzerFeld = state.nutzerFeld.map(row => row.map(cell => cell === 1 ? 0 : cell));
  }
  const stateText = htmlEscapen(JSON.stringify(safeState, null, 2));
  const gameName = htmlEscapen({ connect4: '4 Gewinnt', tictactoe: 'Tic Tac Toe', battleship: 'Schiffe versenken', ludo: 'Mensch ärgere dich nicht', wordgame: 'Wortspiel', akinator: 'Wer bin ich?' }[game.game_type] || game.game_type);
  const canMove = game.status === 'active' && state.amZug === 'poke';
  const controls = canMove ? agentSpielFelder(game.game_type, state) : '<p>Du bist gerade nicht am Zug. Öffne diesen Link erneut, wenn yRelay dich zum Zug auffordert.</p>';
  res.type('html').send(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${gameName} · yRelay</title>
<style>body{margin:0;background:#101820;color:#edf2f4;font:16px system-ui,sans-serif}.page{max-width:720px;margin:36px auto;padding:24px}h1{font-size:24px}section,form{padding:20px 0;border-top:1px solid #35434c}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1b2932;padding:16px;border-radius:8px;max-height:320px;overflow:auto}label{display:block;margin:14px 0 8px}input,select,textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #56636c;border-radius:6px;background:#17242c;color:inherit;font:inherit}textarea{min-height:130px}button{margin-top:16px;padding:11px 18px;border:0;border-radius:6px;background:#2b9b87;color:white;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.5}#status{min-height:24px;color:#8be0c2}</style>
<main class="page"><h1>${gameName}</h1><p>Agent: ${agentName} · Status: ${htmlEscapen(game.status)} · Zug: ${htmlEscapen(state.amZug || 'beendet')}</p>
<section><strong>Spielstand</strong><pre>${stateText}</pre></section><form id="move" data-type="${htmlEscapen(game.game_type)}" data-phase="${htmlEscapen(state.phase || '')}" data-rater="${isAkinatorRater ? 'true' : 'false'}" ${canMove ? '' : 'hidden'}>${controls}<label>Spiel-Chat (optional)<input name="chat" type="text" maxlength="500"></label><button type="submit" ${canMove ? '' : 'disabled'}>Spielzug senden</button><p id="status" role="status"></p></form>${canMove ? '' : '<p id="status" role="status">Kein Zug erforderlich.</p>'}</main>
<script>const form=document.getElementById('move');if(form)form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);const value=name=>data.get(name);const type=form.dataset.type;const phase=form.dataset.phase;let zug;if(type==='connect4')zug={spalte:Number(value('spalte'))};else if(type==='tictactoe')zug={feld:Number(value('feld'))};else if(type==='battleship')zug=phase==='setup_poke'?{setupWahl:JSON.parse(value('setup'))}:{r:Number(value('reihe')),c:Number(value('spalte'))};else if(type==='ludo')zug={figur:Number(value('figur'))};else if(type==='wordgame')zug={wort:value('wort')};else if(type==='akinator'){if(phase==='wort_auswahl')zug={aktion:'wort_festlegen',wort:value('wort')};else if(phase==='voting')zug={aktion:'abstimmen',zustimmung:value('zustimmung')==='true'};else if(form.dataset.rater==='true'){const action=value('aktion');zug=action==='frage'?{frage:value('frage')}:action==='loesen'?{aktion:'loesen',wort:value('frage')}:{aktion:'tipp'};}else zug={antwort:value('antwort')};}try{const response=await fetch('/api/webhooks/game-move/${encodeURIComponent(req.params.gameId)}/${encodeURIComponent(req.params.token)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({zug,chat:value('chat')||undefined})});const result=await response.json();if(!response.ok)throw new Error(result.fehler||'Spielzug fehlgeschlagen');document.getElementById('status').textContent=result.nachricht||'Spielzug wurde übermittelt. Öffne den Link erneut für den aktualisierten Spielstand.';form.querySelector('button[type=submit]').disabled=true;}catch(error){document.getElementById('status').textContent=error.message;}});</script></html>`);
}

function zeigeAgentSchulseite(req, res) {
  const integration = db.prepare(`
    SELECT si.id, si.token, p.name AS agent_name
    FROM schul_integrationen si JOIN poke_profiles p ON p.id = si.profil_id
    WHERE si.id = ? AND si.token = ? AND p.interface_mode = 'website'
  `).get(req.params.integrationId, req.params.token);
  if (!integration) return res.status(404).send('Dieser Schul-Dashboard-Link ist ungültig oder abgelaufen.');
  const agentName = htmlEscapen(integration.agent_name);
  const taskMessageId = Number.isSafeInteger(Number(req.query.messageId)) ? Number(req.query.messageId) : null;
  const taskMessageToken = typeof req.query.messageToken === 'string' && /^[a-f0-9]{32}$/.test(req.query.messageToken)
    ? req.query.messageToken
    : null;
  res.type('html').send(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Schul-Dashboard · yRelay</title>
<style>body{margin:0;background:#101820;color:#edf2f4;font:16px system-ui,sans-serif}.page{max-width:760px;margin:36px auto;padding:24px}h1{font-size:24px}form{padding:20px 0;border-top:1px solid #35434c}label{display:block;margin:14px 0 8px}input,select,textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #56636c;border-radius:6px;background:#17242c;color:inherit;font:inherit}textarea{min-height:220px;font-family:ui-monospace,monospace}button{margin-top:16px;padding:11px 18px;border:0;border-radius:6px;background:#2b9b87;color:white;font:inherit;font-weight:700;cursor:pointer}#status{min-height:24px;color:#8be0c2}</style>
<main class="page"><h1>Schul-Dashboard</h1><p>Agent: ${agentName}</p><form id="update"><label for="type">Bereich</label><select id="type"><option value="kalender">Kalender</option><option value="aufgabe">Aufgaben</option><option value="klausuren">Klausuren</option><option value="stundenplan">Stundenplan</option><option value="feed">Meldung</option><option value="chat">Chat-Antwort</option><option value="ping">Stille Notiz</option><option value="kachel">Kachel</option></select><label for="data">Inhalt für den ausgewählten Bereich (JSON)</label><textarea id="data" required spellcheck="false" placeholder='[{"titel":"Beispiel","start":"2026-10-06T10:00:00"}]'></textarea><button type="submit">Eintrag übermitteln</button><p id="status" role="status"></p></form></main>
<script>const form=document.getElementById('update');form.addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('status');try{const daten=JSON.parse(document.getElementById('data').value);const response=await fetch('/api/webhooks/schul-update/${encodeURIComponent(integration.token)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({typ:document.getElementById('type').value,daten,messageId:${taskMessageId || 'null'},messageToken:${JSON.stringify(taskMessageToken)}})});const result=await response.json();if(!response.ok)throw new Error(result.fehler||'Übermittlung fehlgeschlagen');status.textContent='Daten wurden übernommen.';}catch(error){status.textContent=error.message;}});</script></html>`);
}

function normalisiereStundenplan(daten) {
  const eintraege = Array.isArray(daten) ? daten : daten?.eintraege || daten?.stunden || daten?.stundenplan;
  if (!Array.isArray(eintraege)) return null;
  const wochentage = {
    sonntag: 7, sunday: 7, montag: 1, monday: 1, dienstag: 2, tuesday: 2,
    mittwoch: 3, wednesday: 3, donnerstag: 4, thursday: 4, freitag: 5,
    friday: 5, samstag: 6, saturday: 6, sonntag: 7
  };
  return eintraege.map(stunde => {
    const tag = typeof stunde.wochentag === 'string'
      ? wochentage[stunde.wochentag.trim().toLowerCase()] || Number(stunde.wochentag)
      : stunde.wochentag;
    return {
      wochentag: Number(tag),
      fach: stunde.fach || stunde.fachname || stunde.subject,
      lehrer: stunde.lehrer || stunde.lehrername || stunde.teacher || null,
      start: stunde.start || stunde.startzeit || stunde.von,
      ende: stunde.ende || stunde.endzeit || stunde.bis || null,
      raum: stunde.raum || stunde.raumname || stunde.room || null,
      notiz: stunde.notiz || stunde.hinweis || null,
    };
  });
}

function normalisiereSchulPayload(body) {
  let payload = body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { return null; }
  }
  if (!payload || typeof payload !== 'object') return null;
  if (payload.body && typeof payload.body === 'object') payload = payload.body;
  if (payload.payload && typeof payload.payload === 'object') payload = payload.payload;
  const typen = {
    timetable: 'stundenplan', schedule: 'stundenplan', calendar: 'kalender',
    events: 'kalender', task: 'aufgabe', tasks: 'aufgabe', notification: 'feed',
    message: 'feed', tile: 'kachel', card: 'kachel', exams: 'klausuren', klausur: 'klausuren',
    chat: 'chat', chat_antwort: 'chat',
    ping: 'ping', gemerkt: 'ping', spaeter: 'ping', reminder: 'ping', note: 'ping'
  };
  const typ = typen[String(payload.typ || payload.type || '').toLowerCase()] || payload.typ || payload.type;
  const daten = payload.daten !== undefined ? payload.daten : (payload.data !== undefined ? payload.data : payload.entries);
  return { typ, daten };
}

// Hilfsfunktion: reply_content als Array lesen (rückwärtskompatibel)
function leseAntworten(replyContent) {
  if (!replyContent) return [];
  try {
    const parsed = JSON.parse(replyContent);
    return Array.isArray(parsed) ? parsed : [{ text: replyContent, time: null }];
  } catch {
    return [{ text: replyContent, time: null }];
  }
}

// POST /api/webhooks/poke-reply/:id/:token
const verarbeiteAgentAntwort = (req, res) => {
  const { id, token } = req.params;
  const { message, buttons } = req.body;

  if (!message) {
    return res.status(400).json({ fehler: 'Feld "message" fehlt im JSON-Body.' });
  }

  // Nachricht prüfen und zugehörige Nutzer-Daten holen (inkl. user_replies)
  const msg = db.prepare(`
    SELECT m.id, m.type, m.content, m.reply_content, m.user_replies, m.poke_profile_id, u.id as user_id, u.email, u.username, u.ntfy_topic, u.email_notifications, u.pushover_user_key
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ? AND m.reply_token = ?
  `).get(id, token);

  if (!msg) {
    return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });
  }

  // Bestehende Poke-Antworten laden und neue anhängen
  const bestehendePokeAntworten = leseAntworten(msg.reply_content);
  const istErstantwort = bestehendePokeAntworten.length === 0;

  bestehendePokeAntworten.push({
    text: message,
    buttons: Array.isArray(buttons) && buttons.length > 0 ? buttons.slice(0, 5) : null,
    time: new Date().toISOString(),
  });

  // Als JSON speichern
  db.prepare(`
    UPDATE messages
    SET reply_content = ?, replied_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(bestehendePokeAntworten), id);

  if (msg.type === 'school') {
    const integration = db.prepare(`
      SELECT id FROM schul_integrationen WHERE nutzer_id = ? AND profil_id = ?
    `).get(msg.user_id, msg.poke_profile_id);
    if (integration) {
      db.prepare('INSERT INTO schul_chat (integration_id, absender, inhalt) VALUES (?, ?, ?)')
        .run(integration.id, 'poke', message);
      
      try {
        const { notifyClients } = require('./schuldashboard');
        notifyClients(integration.id, 'update');
      } catch (e) {}
    }
  }

  // Nutzer-Antworten laden (für vollständigen Verlauf in der Mail)
  let nutzerAntworten = [];
  try {
    if (msg.user_replies) nutzerAntworten = JSON.parse(msg.user_replies);
  } catch {}

  // Poke Profil Name laden
  let pokeName = 'KI-Agent';
  if (msg.poke_profile_id) {
    const profil = db.prepare('SELECT name FROM poke_profiles WHERE id = ?').get(msg.poke_profile_id);
    if (profil) pokeName = profil.name;
  }

  // Gemischten Verlauf (chronologisch: Poke & Nutzer) für die Mail aufbauen
  const gemischterVerlauf = [
    ...bestehendePokeAntworten.map(a => ({ ...a, von: 'poke', pokeName })),
    ...nutzerAntworten.map(a => ({ ...a, von: 'nutzer', name: msg.username })),
  ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

  // E-Mail-Benachrichtigung senden (asynchron im Hintergrund)
  const hasButtons = Array.isArray(buttons) && buttons.length > 0;
  
  if (msg.email && String(msg.email_notifications) !== '0' && String(msg.email_notifications) !== 'false') {
    if (hasButtons) {
      sendeRueckfrageMail(msg.email, msg.username, msg.content, message, buttons, msg.id, token, gemischterVerlauf, pokeName).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Rückfrage-Mail:', err);
      });
    } else {
      sendeAntwortMail(msg.email, msg.username, msg.content, message, !istErstantwort, gemischterVerlauf, pokeName).catch(err => {
        console.error('[yRelay] Fehler beim Senden der Antwort-Mail:', err);
      });
    }
  }
  
  const { sendePushUndMail } = require('../services/notify');
  const appUrl = require('../db').getSetting('app_url') || 'http://localhost:3000';
  sendePushUndMail(msg, {
    betreff: hasButtons ? `Rückfrage von ${pokeName}` : `${pokeName} hat geantwortet`,
    inhalt: message,
    icon: hasButtons ? '❓' : '🤖',
    ctaUrl: `${appUrl}/#dashboard`,
    ntfyTags: hasButtons ? ['question', 'robot'] : ['robot', 'envelope'],
    ntfyPriority: hasButtons ? 4 : 3,
    nurPush: true,
  }).catch(err => console.error('[yRelay] Fehler beim Senden der Push-Antwort:', err));

  logAudit(msg.user_id, 'poke_reply_received', { message_id: msg.id, has_buttons: hasButtons });

  res.json({ success: true, message: 'Antwort erfolgreich gespeichert.' });
};

// GET /api/webhooks/fo-oauth/callback - Redirect-Ziel der FO-OAuth-Autorisierung
router.get('/fo-oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect('/?fo=fehler#admin');
  }
  try {
    const profil = await require('../services/fo-oauth').schliesseAutorisierungAb(state, code);
    logAudit(null, 'admin_fo_oauth_connected', { profil_id: profil.id });
    res.redirect('/?fo=verbunden#admin');
  } catch (err) {
    console.error('[yRelay] FO-OAuth fehlgeschlagen:', err.message);
    res.redirect('/?fo=fehler#admin');
  }
});

router.verarbeiteAgentAntwort = verarbeiteAgentAntwort;
router.post('/poke-reply/:id/:token', verarbeiteAgentAntwort);
router.post('/agent-reply/:id/:token', verarbeiteAgentAntwort);
router.get('/agent-page/:id/:token', zeigeAgentAntwortseite);

// POST /api/webhooks/poke-action/:id/:token - Poke markiert Nachricht als erledigt/pinnt sie
router.post('/poke-action/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { action, notiz } = req.body; // action: 'erledigt' | 'in_bearbeitung' | 'pin'

  if (!action) return res.status(400).json({ fehler: 'Feld "action" fehlt.' });

  const msg = db.prepare(`
    SELECT m.id, m.content, m.poke_profile_id, u.id as user_id, u.email, u.username, u.ntfy_topic, u.email_notifications, u.pushover_user_key
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ? AND m.reply_token = ?
  `).get(id, token);

  if (!msg) return res.status(404).json({ fehler: 'Nachricht nicht gefunden oder Token ungültig.' });

  const erlaubteActions = ['erledigt', 'in_bearbeitung', 'offen', 'pin', 'unpin'];
  if (!erlaubteActions.includes(action)) {
    return res.status(400).json({ fehler: `Action muss eine von ${erlaubteActions.join(', ')} sein.` });
  }

  if (action === 'pin') {
    db.prepare('UPDATE messages SET is_pinned = 1 WHERE id = ?').run(id);
  } else if (action === 'unpin') {
    db.prepare('UPDATE messages SET is_pinned = 0 WHERE id = ?').run(id);
  } else {
    db.prepare('UPDATE messages SET status_label = ?, status_label_notiz = ? WHERE id = ?')
      .run(action, notiz || null, id);
      
    // Benachrichtigung senden, wenn der Status geändert wird
    const { sendePushUndMail } = require('../services/notify');
    
    let titel = '';
    let emoji = 'ℹ️';
    let farbe = '#6366f1, #8b5cf6';
    let tags = ['information_source'];
    
    if (action === 'erledigt') {
      titel = 'Aufgabe erledigt ✅';
      emoji = '✅';
      farbe = '#10b981, #059669'; // Gruen
      tags = ['white_check_mark'];
    } else if (action === 'in_bearbeitung') {
      titel = 'Aufgabe in Bearbeitung ⏳';
      emoji = '⏳';
      farbe = '#f59e0b, #d97706'; // Orange
      tags = ['hourglass'];
    } else if (action === 'offen') {
      titel = 'Aufgabe wieder offen 📝';
      emoji = '📝';
      tags = ['memo'];
    }

    const agentName = db.prepare('SELECT name FROM poke_profiles WHERE id = ?').get(msg.poke_profile_id)?.name || 'KI-Agent';
    const inhaltHTML = `${htmlEscapen(agentName)} hat den Status deiner Nachricht auf <strong>${htmlEscapen(action)}</strong> gesetzt.<br><br>
    <em>Deine Nachricht: "${htmlEscapen(msg.content.substring(0, 100))}${msg.content.length > 100 ? '...' : ''}"</em>
    ${notiz ? `<br><br><strong>Notiz von ${htmlEscapen(agentName)}:</strong> ${htmlEscapen(notiz)}` : ''}`;

    sendePushUndMail(msg, {
      betreff: `${agentName} Status-Update: ${titel}`,
      inhalt: inhaltHTML,
      icon: emoji,
      farbe: farbe,
      ntfyTags: tags
    }).catch(err => console.error('[yRelay] Fehler bei Push/Mail (Status-Update):', err));

    logAudit(msg.user_id, 'poke_status_update', { message_id: msg.id, action, notiz });
  }

  console.log(`[yRelay] Poke hat Nachricht ${id} mit Action "${action}" markiert.`);
  res.json({ success: true });
});

// POST /api/webhooks/schul-update/:token
router.post('/schul-update/:token', (req, res) => {
  const integration = db.prepare(`
    SELECT id, nutzer_id, profil_id FROM schul_integrationen WHERE token = ?
  `).get(req.params.token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Schul-Integrationstoken.' });

  const schulPayload = normalisiereSchulPayload(req.body);
  if (!schulPayload || !schulPayload.typ) {
    return res.status(400).json({ fehler: 'Schul-Webhook erwartet typ/type und daten/data als JSON.' });
  }
  const { typ, daten } = schulPayload;
  
  try {
    const update = db.transaction(() => {
    if (typ === 'kalender') {
      if (!Array.isArray(daten)) return res.status(400).json({ fehler: 'Kalenderdaten müssen ein Array sein.' });
      for (const t of daten) {
        if (!t.titel || !t.start) return res.status(400).json({ fehler: 'Kalendereintrag benötigt titel und start.' });
      }
      db.prepare('DELETE FROM schul_kalender_cache WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare('INSERT INTO schul_kalender_cache (integration_id, titel, start, ende, ganztaegig, notiz) VALUES (?, ?, ?, ?, ?, ?)');
      for (const t of daten) {
        stmt.run(integration.id, t.titel, t.start, t.ende || null, t.ganztaegig ? 1 : 0, t.notiz || null);
      }
    } else if (typ === 'aufgabe') {
      if (!Array.isArray(daten)) return res.status(400).json({ fehler: 'Aufgabendaten müssen ein Array sein.' });
      for (const a of daten) {
        if (!a.titel) return res.status(400).json({ fehler: 'Aufgabe benötigt einen titel.' });
      }
      db.prepare('DELETE FROM schul_aufgaben_cache WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare('INSERT INTO schul_aufgaben_cache (integration_id, titel, faellig, erledigt, notiz) VALUES (?, ?, ?, ?, ?)');
      for (const a of daten) {
        stmt.run(integration.id, a.titel, a.faellig || null, a.erledigt ? 1 : 0, a.notiz || null);
      }
    } else if (typ === 'klausuren') {
      if (!Array.isArray(daten)) return res.status(400).json({ fehler: 'Klausurendaten müssen ein Array sein.' });
      for (const k of daten) {
        if (!k.titel || !k.datum) return res.status(400).json({ fehler: 'Klausur benötigt titel und datum.' });
      }
      db.prepare('DELETE FROM schul_klausuren_cache WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare('INSERT INTO schul_klausuren_cache (integration_id, titel, datum, notiz) VALUES (?, ?, ?, ?)');
      for (const k of daten) {
        stmt.run(integration.id, k.titel, k.datum, k.notiz || null);
      }
    } else if (typ === 'feed') {
      if (!daten || !daten.inhalt) return res.status(400).json({ fehler: 'Feeddaten benötigen inhalt.' });
      db.prepare('INSERT INTO schul_feed (integration_id, typ, inhalt) VALUES (?, ?, ?)')
        .run(integration.id, daten.typ || 'info', daten.inhalt);
    } else if (typ === 'chat') {
      // Poke-Chat-Antwort im Dashboard anzeigen
      const chatInhalt = daten?.inhalt || (typeof daten === 'string' ? daten : null);
      if (!chatInhalt) return res.status(400).json({ fehler: 'Chat-Nachricht benötigt inhalt.' });
      db.prepare('INSERT INTO schul_chat (integration_id, absender, inhalt) VALUES (?, ?, ?)')
        .run(integration.id, 'poke', chatInhalt);
    } else if (typ === 'ping') {
      // Stiller Poke-Ping: kein Alert, landet in "Gemerkt für später"
      const pingInhalt = daten?.inhalt || (typeof daten === 'string' ? daten : null);
      if (!pingInhalt) return res.status(400).json({ fehler: 'Ping benötigt inhalt.' });
      db.prepare('INSERT INTO schul_pings (integration_id, inhalt) VALUES (?, ?)')
        .run(integration.id, pingInhalt);
    } else if (typ === 'stundenplan') {
      const stunden = normalisiereStundenplan(daten);
      if (!stunden) return res.status(400).json({ fehler: 'Stundenplandaten müssen ein Array oder ein Objekt mit eintraege/stunden/stundenplan sein.' });
      for (const stunde of stunden) {
        if (!Number.isInteger(stunde.wochentag) || stunde.wochentag < 1 || stunde.wochentag > 7 || !stunde.fach || !/^\d{1,2}:\d{2}$/.test(stunde.start) || (stunde.ende && !/^\d{1,2}:\d{2}$/.test(stunde.ende))) {
          return res.status(400).json({ fehler: 'Stundenplaneintrag benötigt wochentag (1-7), fach und start (HH:MM).' });
        }
      }
      db.prepare('DELETE FROM schul_stundenplan WHERE integration_id = ?').run(integration.id);
      const stmt = db.prepare(`INSERT INTO schul_stundenplan
        (integration_id, wochentag, fach, lehrer, start, ende, raum, notiz) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const stunde of stunden) {
        stmt.run(integration.id, stunde.wochentag, stunde.fach, stunde.lehrer || null, stunde.start, stunde.ende || null, stunde.raum || null, stunde.notiz || null);
      }
    } else if (typ === 'kachel') {
      if (!daten || typeof daten !== 'object' || !daten.schluessel || !daten.aktion) {
        return res.status(400).json({ fehler: 'Kachel benötigt aktion und schluessel.' });
      }
      if (daten.aktion === 'delete') {
        db.prepare('DELETE FROM schul_kacheln WHERE integration_id = ? AND schluessel = ?').run(integration.id, daten.schluessel);
      } else if (daten.aktion === 'upsert') {
        if (!daten.titel || !daten.inhalt) return res.status(400).json({ fehler: 'Kachel benötigt titel und inhalt.' });
        const formular = Array.isArray(daten.formular) ? daten.formular.slice(0, 12) : [];
        const erlaubteTypen = ['text', 'date', 'time', 'textarea', 'select'];
        if ((daten.farbe && !/^#[0-9a-f]{6}$/i.test(daten.farbe)) || formular.some(f => typeof f.name !== 'string' || typeof f.label !== 'string' || !f.name || !f.label || !erlaubteTypen.includes(f.type) || (f.type === 'select' && (!Array.isArray(f.options) || f.options.some(option => typeof option !== 'string'))))) {
          return res.status(400).json({ fehler: 'Ungültige Kachel-Formularfelder.' });
        }
        db.prepare(`INSERT INTO schul_kacheln
          (integration_id, schluessel, titel, icon, farbe, inhalt, formular, sortierung, aktualisiert_am)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(integration_id, schluessel) DO UPDATE SET titel=excluded.titel, icon=excluded.icon,
          farbe=excluded.farbe, inhalt=excluded.inhalt, formular=excluded.formular,
          sortierung=excluded.sortierung, aktualisiert_am=CURRENT_TIMESTAMP`).run(
          integration.id, daten.schluessel, daten.titel, daten.icon || '🧩', daten.farbe || '#6366f1',
          daten.inhalt, JSON.stringify(formular), Number.isInteger(daten.sortierung) ? daten.sortierung : 0
        );
      } else {
        return res.status(400).json({ fehler: 'Kachel-Aktion muss upsert oder delete sein.' });
      }
    } else {
      return res.status(400).json({ fehler: `Unbekannter oder nicht unterstützter Typ: ${typ}` });
    }
    });
    update();

    const taskMessageId = Number(req.body.messageId);
    if (Number.isSafeInteger(taskMessageId) && typeof req.body.messageToken === 'string') {
      const taskMessage = db.prepare(`
        SELECT id, reply_content FROM messages
        WHERE id = ? AND reply_token = ? AND user_id = ? AND poke_profile_id = ? AND type = 'school'
      `).get(taskMessageId, req.body.messageToken, integration.nutzer_id, integration.profil_id);
      if (taskMessage) {
        const replies = leseAntworten(taskMessage.reply_content);
        const confirmation = typ === 'chat' && typeof daten === 'object' && daten?.inhalt
          ? daten.inhalt
          : `Schul-Dashboard aktualisiert (${typ}).`;
        replies.push({ text: confirmation, time: new Date().toISOString() });
        db.prepare('UPDATE messages SET reply_content = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(JSON.stringify(replies), taskMessage.id);
      }
    }
    
    try {
      const { notifyClients } = require('./schuldashboard');
      notifyClients(integration.id, 'update');
    } catch (e) {}

    db.prepare('UPDATE schul_integrationen SET zuletzt_aktualisiert = CURRENT_TIMESTAMP WHERE id = ?').run(integration.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[yRelay] Fehler beim Verarbeiten des Schul-Webhooks:', err.message);
    res.status(500).json({ fehler: err.message });
  }
});

// ─── POST /api/webhooks/game-move/:gameId/:token - Poke macht einen Spielzug ─
router.post('/game-move/:gameId/:token', async (req, res) => {
  const { gameId, token } = req.params;

  const spiel = db.prepare('SELECT * FROM games WHERE id = ? AND webhook_token = ? AND status = ?').get(gameId, token, 'active');
  if (!spiel) return res.status(404).json({ fehler: 'Spiel nicht gefunden oder bereits beendet.' });

  let state;
  try { state = JSON.parse(spiel.state); } catch { return res.status(500).json({ fehler: 'Spielstand korrupt.' }); }

  if (state.amZug !== 'poke') return res.status(409).json({ fehler: 'Der Nutzer ist am Zug!' });

  const Connect4 = require('../services/game-logic/connect4');
  const TicTacToe = require('../services/game-logic/tictactoe');
  const Battleship = require('../services/game-logic/battleship');
  const Ludo = require('../services/game-logic/ludo');
  const Wordgame = require('../services/game-logic/wordgame');
  const Akinator = require('../services/game-logic/akinator');
  const { notifyGameClients } = require('./games');

  const { zug, chat } = req.body;
  let ergebnis;

  try {
    switch (spiel.game_type) {
      case 'connect4': {
        const spalte = parseInt(zug?.spalte ?? zug?.col ?? zug?.column);
        if (isNaN(spalte)) return res.status(400).json({ fehler: 'Zug erfordert: { "zug": { "spalte": 0-6 } }' });
        ergebnis = Connect4.spielzugMachen(state, spalte, 'poke');
        break;
      }
      case 'tictactoe': {
        const feld = parseInt(zug?.feld ?? zug?.field ?? zug?.index);
        if (isNaN(feld)) return res.status(400).json({ fehler: 'Zug erfordert: { "zug": { "feld": 0-8 } }' });
        ergebnis = TicTacToe.spielzugMachen(state, feld, 'poke');
        break;
      }
      case 'battleship': {
        if (zug?.setupWahl) {
          ergebnis = Battleship.pokeSetupWaehlen(state, zug.setupWahl);
        } else {
          const r = parseInt(zug?.r ?? zug?.reihe ?? zug?.row);
          const c = parseInt(zug?.c ?? zug?.spalte ?? zug?.col);
          if (isNaN(r) || isNaN(c)) return res.status(400).json({ fehler: 'Zug erfordert: { "zug": { "r": 0-9, "c": 0-9 } }' });
          ergebnis = Battleship.schiessen(state, r, c, 'poke');
        }
        break;
      }
      case 'ludo': {
        const augenzahl = Ludo.wuerfeln();
        const verfuegbar = Ludo.verfuegbareFiguren(state, 'poke', augenzahl);
        if (verfuegbar.length === 0) {
          const neuerState = { ...state, amZug: 'nutzer', mussWuerfeln: true };
          db.prepare('UPDATE games SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(neuerState), spiel.id);
          notifyGameClients(spiel.user_id, 'game_update', { spielId: spiel.id, userId: spiel.user_id });
          return res.json({ erfolg: true, augenzahl, state: neuerState, nachricht: 'Poke konnte nicht ziehen.' });
        }
        const figurIdx = zug?.figur !== undefined ? parseInt(zug.figur) : verfuegbar[0];
        ergebnis = Ludo.spielzugMachen(state, figurIdx, augenzahl, 'poke');
        break;
      }
      case 'wordgame': {
        const wort = zug?.wort;
        if (!wort) return res.status(400).json({ fehler: 'Zug erfordert: { "zug": { "wort": "deinwort" } }' });
        ergebnis = Wordgame.wortEingeben(state, wort, 'poke');
        break;
      }
      case 'akinator': {
        ergebnis = Akinator.spielzugMachen(state, zug, 'poke');
        break;
      }
      default:
        return res.status(400).json({ fehler: 'Unbekannter Spieltyp.' });
    }
  } catch (e) {
    return res.status(500).json({ fehler: 'Interner Fehler bei der Spiellogik: ' + e.message });
  }

  if (!ergebnis.erfolg) return res.status(400).json({ fehler: ergebnis.fehler });

  const neuerState = ergebnis.state;
  
  // Game-Chat Integration
  if (chat && typeof chat === 'string') {
    neuerState.chat = neuerState.chat || [];
    neuerState.chat.push({ absender: 'poke', text: chat.substring(0, 500) });
  }

  const spielEnde = neuerState.gewinner !== null;
  db.prepare('UPDATE games SET state = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(neuerState), spielEnde ? 'finished' : 'active', spiel.id);

  // SSE-Push an den Nutzer-Browser
  try { notifyGameClients(spiel.user_id, 'game_update', { spielId: spiel.id, userId: spiel.user_id }); } catch (e) {}

  logAudit(spiel.user_id, 'spielzug_poke', { spielId: spiel.id, gameType: spiel.game_type });
  res.json({ erfolg: true, state: neuerState });
});

// ─── GET /api/webhooks/poke-data/wetter?token=TOKEN ─────────────────────────
router.get('/poke-data/wetter', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ fehler: 'Token fehlt.' });

  const integration = db.prepare(`
    SELECT si.nutzer_id FROM schul_integrationen si WHERE si.token = ?
  `).get(token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Token.' });

  const nutzer = db.prepare('SELECT schul_wetter_ort FROM users WHERE id = ?').get(integration.nutzer_id);
  const suchOrt = req.query.ort || nutzer?.schul_wetter_ort;
  
  if (!suchOrt) {
    return res.status(404).json({ fehler: 'Kein Ort angegeben (Parameter ?ort=X) und kein Standardort im Dashboard konfiguriert.' });
  }

  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suchOrt)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'yRelay/1.0' }
    });
    const geo = await geoRes.json();
    if (!geo.length) return res.status(404).json({ fehler: `Ort '${suchOrt}' nicht gefunden.` });
    const { lat, lon, display_name } = geo[0];

    const heuteStr = new Date().toISOString().split('T')[0];
    const in7Tagen = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Brightsky API (offizielle DWD Daten)
    const wetterRes = await fetch(`https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${heuteStr}&last_date=${in7Tagen}`);
    const data = await wetterRes.json();
    
    if (!data.weather || data.weather.length === 0) {
      return res.status(404).json({ fehler: 'Keine DWD Wetterdaten für diesen Ort gefunden.' });
    }

    // Aktuelles Wetter (nächster passender Stundenwert)
    const jetzt = new Date().toISOString();
    let cw = data.weather[0];
    for (const w of data.weather) {
      if (w.timestamp >= jetzt) { cw = w; break; }
    }

    // Täglich aggregieren für die Vorhersage
    const dailyMap = {};
    for (const w of data.weather) {
      const day = w.timestamp.split('T')[0];
      if (!dailyMap[day]) {
        dailyMap[day] = { min: 999, max: -999, precip: 0, conditions: {} };
      }
      const d = dailyMap[day];
      if (w.temperature !== null && w.temperature < d.min) d.min = w.temperature;
      if (w.temperature !== null && w.temperature > d.max) d.max = w.temperature;
      if (w.precipitation) d.precip += w.precipitation;
      if (w.condition) {
        d.conditions[w.condition] = (d.conditions[w.condition] || 0) + 1;
      }
    }

    const vorhersage = [];
    for (const day of Object.keys(dailyMap).sort().slice(0, 7)) {
      const d = dailyMap[day];
      // Häufigste Bedingung finden
      let bestCond = 'unbekannt';
      let maxCond = 0;
      for (const [cond, count] of Object.entries(d.conditions)) {
        if (count > maxCond && cond !== 'dry') { // 'dry' ignorieren, falls es aussagekräftigere gibt
          maxCond = count; 
          bestCond = cond; 
        }
      }
      if (bestCond === 'unbekannt' && d.conditions['dry']) bestCond = 'dry';

      vorhersage.push({
        datum: day,
        zustand: bestCond,
        max_temp: d.max === -999 ? null : Math.round(d.max),
        min_temp: d.min === 999 ? null : Math.round(d.min),
        niederschlag_mm: Math.round(d.precip * 10) / 10
      });
    }

    res.json({
      ort: display_name.split(',')[0],
      quelle: 'Deutscher Wetterdienst (DWD)',
      aktuell: {
        temperatur: cw.temperature !== null ? Math.round(cw.temperature) : null,
        zustand: cw.condition || 'unbekannt',
        wind_kmh: cw.wind_speed !== null ? Math.round(cw.wind_speed) : null
      },
      vorhersage: vorhersage
    });
  } catch (e) {
    res.status(500).json({ fehler: 'Wetterdaten konnten nicht abgerufen werden: ' + e.message });
  }
});

// ─── GET /api/webhooks/poke-data/abfahrten?token=TOKEN ──────────────────────
router.get('/poke-data/abfahrten', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ fehler: 'Token fehlt.' });

  const integration = db.prepare('SELECT nutzer_id FROM schul_integrationen WHERE token = ?').get(token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Token.' });

  const nutzer = db.prepare('SELECT schul_haltestelle_id, schul_haltestelle_name FROM users WHERE id = ?').get(integration.nutzer_id);
  if (!nutzer?.schul_haltestelle_id) return res.status(404).json({ fehler: 'Keine Haltestelle konfiguriert.' });

  try {
    const url = `https://openservice-test.vrr.de/standard/XML_DM_REQUEST?outputFormat=JSON&type_dm=stopID&name_dm=${encodeURIComponent(nutzer.schul_haltestelle_id)}&mode=direct&useRealtime=1&limit=10`;
    const efaRes = await fetch(url, { headers: { 'User-Agent': 'yRelay/1.0' } });
    const data = await efaRes.json();
    const liste = Array.isArray(data?.departureList) ? data.departureList : [data?.departureList].filter(Boolean);

    const abfahrten = liste.slice(0, 10).map(dep => {
      const dt = dep.dateTime, rdt = dep.realDateTime;
      const planZeit = dt ? `${String(dt.hour).padStart(2,'0')}:${String(dt.minute).padStart(2,'0')}` : null;
      const echtZeit = rdt ? `${String(rdt.hour).padStart(2,'0')}:${String(rdt.minute).padStart(2,'0')}` : null;
      let verspaetung = 0;
      if (dt && rdt) verspaetung = (parseInt(rdt.hour)*60+parseInt(rdt.minute)) - (parseInt(dt.hour)*60+parseInt(dt.minute));
      return { linie: dep.servingLine?.number || '?', ziel: dep.servingLine?.direction || '?', planZeit, echtZeit, verspaetung };
    });

    res.json({ haltestelle: nutzer.schul_haltestelle_name, abfahrten });
  } catch (e) {
    res.status(500).json({ fehler: 'Abfahrten konnten nicht abgerufen werden.' });
  }
});

// ─── GET /api/webhooks/poke-data/verbindung?token=TOKEN&von=X&nach=Y&datum=YYYY-MM-DD&zeit=HH:MM
router.get('/poke-data/verbindung', async (req, res) => {
  const { token, von, nach, datum, zeit } = req.query;
  if (!token) return res.status(401).json({ fehler: 'Token fehlt.' });
  if (!von || !nach) return res.status(400).json({ fehler: 'Parameter "von" und "nach" sind erforderlich.' });

  const integration = db.prepare('SELECT nutzer_id FROM schul_integrationen WHERE token = ?').get(token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Token.' });

  // Hilfsfunktion zum Auflösen von Adressen/Namen in EFA-IDs oder saubere Namen
  async function resolveLocation(query) {
    if (/^\d+$/.test(query)) return { type: 'stop', name: query };
    try {
      const url = `https://openservice-test.vrr.de/standard/XML_STOPFINDER_REQUEST?outputFormat=JSON&type_sf=any&name_sf=${encodeURIComponent(query)}&anyObjFilter_sf=0`;
      const sfRes = await fetch(url, { headers: { 'User-Agent': 'yRelay/1.0' }});
      const data = await sfRes.json();
      const pts = Array.isArray(data.stopFinder?.points?.point) ? data.stopFinder.points.point : [data.stopFinder?.points?.point].filter(Boolean);
      if (pts.length > 0) {
        const best = pts[0];
        if (best.type === 'stop' && best.stateless) return { type: 'stop', name: best.stateless };
        if (best.stateless) return { type: 'any', name: best.stateless };
        if (best.name) return { type: 'any', name: best.name + (best.city ? ', ' + best.city : '') };
      }
    } catch(e) {}
    return { type: 'any', name: query };
  }

  try {
    const vonRes = await resolveLocation(von);
    const nachRes = await resolveLocation(nach);

    let params = `outputFormat=JSON&sessionID=0&requestID=0&type_origin=${vonRes.type}&name_origin=${encodeURIComponent(vonRes.name)}&type_destination=${nachRes.type}&name_destination=${encodeURIComponent(nachRes.name)}`;
    
    // Datum und Zeit
    const jetzt = new Date();
    let itdDate = `${jetzt.getFullYear()}${String(jetzt.getMonth()+1).padStart(2,'0')}${String(jetzt.getDate()).padStart(2,'0')}`;
    let itdTime = `${String(jetzt.getHours()).padStart(2,'0')}${String(jetzt.getMinutes()).padStart(2,'0')}`;
    
    if (datum && /^\d{4}-\d{2}-\d{2}$/.test(datum)) {
      itdDate = datum.replace(/-/g, '');
    }
    if (zeit && /^\d{1,2}:\d{2}$/.test(zeit)) {
      const [h, m] = zeit.split(':');
      itdTime = `${h.padStart(2,'0')}${m.padStart(2,'0')}`;
    }
    params += `&itdDate=${itdDate}&itdTime=${itdTime}&itdTripDateTimeDepArr=dep`;

    const efaRes = await fetch(`https://openservice-test.vrr.de/standard/XML_TRIP_REQUEST2?${params}`, {
      headers: { 'User-Agent': 'yRelay/1.0' }
    });
    const data = await efaRes.json();

    const rawTrips = data?.trips?.trip || data?.trips?.trips || data?.trips?.tripList || data?.trips || [];
    const trips = Array.isArray(rawTrips) ? rawTrips : [rawTrips].filter(Boolean);

    const verbindungen = trips.slice(0, 5).map(trip => {
      const legs = Array.isArray(trip.legs) ? trip.legs : [trip.legs].filter(Boolean);
      const ersterLeg = legs[0];
      const letzterLeg = legs[legs.length - 1];

      const abfahrt = ersterLeg?.points?.[0]?.dateTime?.time || ersterLeg?.points?.find?.(p => p.usage === 'departure')?.dateTime?.time;
      const ankunft = letzterLeg?.points?.[1]?.dateTime?.time || letzterLeg?.points?.find?.(p => p.usage === 'arrival')?.dateTime?.time;

      const abschnitte = legs.map(leg => {
        const vonPunkt = Array.isArray(leg.points) ? leg.points.find(p => p.usage === 'departure') : leg.points?.[0];
        const nachPunkt = Array.isArray(leg.points) ? leg.points.find(p => p.usage === 'arrival') : leg.points?.[1];
        return {
          linie: leg.mode?.number || leg.mode?.name || 'Fußweg',
          typ: leg.mode?.product || 'unbekannt',
          von: vonPunkt?.name || vonPunkt?.nameWO || '?',
          ab: vonPunkt?.dateTime?.time || null,
          nach: nachPunkt?.name || nachPunkt?.nameWO || '?',
          an: nachPunkt?.dateTime?.time || null,
          gleis: vonPunkt?.platformName || null,
        };
      });

      let preis = null;
      const fare = trip.itdFare?.fares?.fare;
      if (fare?.fareAdult) preis = { erwachsene: `${fare.fareAdult} €`, kind: `${fare.fareChild} €` };

      return {
        abfahrt: abfahrt || null,
        ankunft: ankunft || null,
        dauer: trip.duration || null,
        umstiege: parseInt(trip.interchange) || 0,
        von: ersterLeg?.points?.[0]?.name || von,
        nach: letzterLeg?.points?.[1]?.name || nach,
        abschnitte,
        preis,
      };
    });

    res.json({ verbindungen, von, nach });
  } catch (e) {
    res.status(500).json({ fehler: 'Verbindungsauskunft konnte nicht abgerufen werden: ' + e.message });
  }
});

// ─── GET /api/webhooks/poke-data/haltestellen?token=TOKEN&q=Bielefeld ────────
router.get('/poke-data/haltestellen', async (req, res) => {
  const { token, q } = req.query;
  if (!token) return res.status(401).json({ fehler: 'Token fehlt.' });
  if (!q || q.length < 2) return res.status(400).json({ fehler: 'Suchbegriff "q" muss mindestens 2 Zeichen haben.' });

  const integration = db.prepare('SELECT nutzer_id FROM schul_integrationen WHERE token = ?').get(token);
  if (!integration) return res.status(403).json({ fehler: 'Ungültiger Token.' });

  try {
    const url = `https://openservice-test.vrr.de/standard/XML_STOPFINDER_REQUEST?outputFormat=JSON&type_sf=any&name_sf=${encodeURIComponent(q)}`;
    const efaRes = await fetch(url, { headers: { 'User-Agent': 'yRelay/1.0' } });
    const data = await efaRes.json();

    let punkte = data?.stopFinder?.points?.point || data?.stopFinder?.points || [];
    if (!Array.isArray(punkte)) punkte = [punkte];

    const haltestellen = punkte.filter(p => p.type === 'stop' || p.anyType === 'stop').slice(0, 10).map(p => ({
      id: p.ref?.id || p.stateless,
      name: p.name,
      ort: p.ref?.place || p.place || null,
    }));

    res.json({ haltestellen, suchanfrage: q });
  } catch (e) {
    res.status(500).json({ fehler: 'Haltestellensuche fehlgeschlagen.' });
  }
});

module.exports = router;
module.exports.agentReplyPage = zeigeAgentAntwortseite;
module.exports.agentGamePage = zeigeAgentSpielseite;
module.exports.agentSchoolPage = zeigeAgentSchulseite;
router.normalisiereStundenplan = normalisiereStundenplan;
router.normalisiereSchulPayload = normalisiereSchulPayload;
