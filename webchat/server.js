#!/usr/bin/env node
/**
 * Amy Webchat Server
 * Serves a custom chat UI that reads session files directly and renders images/videos.
 * Usage: node server.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// ─── Ed25519 device identity (required for operator.write scope) ──────────────
const ed = require('@noble/ed25519');
ed.hashes.sha512 = (...msgs) => {
  const h = crypto.createHash('sha512');
  for (const m of msgs) h.update(Buffer.from(m));
  return h.digest();
};

const IDENTITY_FILE = path.join(__dirname, '.device-identity.json');

function b64u(bytes) { return Buffer.from(bytes).toString('base64url'); }
function db64u(s) { return new Uint8Array(Buffer.from(s, 'base64url')); }

function loadOrCreateIdentity() {
  try {
    const data = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8'));
    if (data.deviceId && data.publicKey && data.privateKey) return data;
  } catch {}
  const priv = crypto.randomBytes(32);
  const pub = ed.getPublicKey(priv);
  const deviceId = crypto.createHash('sha256').update(pub).digest('hex');
  const identity = { deviceId, publicKey: b64u(pub), privateKey: b64u(Buffer.from(priv)) };
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2));
  return identity;
}

function signConnectPayload(identity, { scopes, signedAtMs, token, nonce }) {
  const payloadStr = ['v2', identity.deviceId, 'openclaw-control-ui', 'ui', 'operator', scopes.join(','), String(signedAtMs), token ?? '', nonce ?? ''].join('|');
  const priv = db64u(identity.privateKey);
  const sig = ed.sign(Buffer.from(payloadStr, 'utf8'), priv);
  return b64u(Buffer.from(sig));
}

const DEVICE_IDENTITY = loadOrCreateIdentity();
console.log('Device identity loaded:', DEVICE_IDENTITY.deviceId.substring(0, 16) + '...');

const PORT = parseInt(process.argv[2] || '8899');
const GATEWAY_WS = 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = 'bf92caa914d892e3acdeb211670523032b60483b94390c0e';
const SESSIONS_JSON = path.join(process.env.HOME, '.openclaw/agents/main/sessions/sessions.json');
const WORKSPACE = path.join(process.env.HOME, '.openclaw/workspace');

// SSE clients
const sseClients = new Set();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSessionFile() {
  try {
    const data = JSON.parse(fs.readFileSync(SESSIONS_JSON, 'utf8'));
    const entry = data['agent:main:main'];
    return entry?.sessionFile || null;
  } catch { return null; }
}

function parseMessages(sessionFile) {
  const messages = [];
  try {
    const lines = fs.readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean);
    // Group: collect pairs of (user/assistant, toolResults)
    let pendingToolResults = {};

    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (entry.type !== 'message') continue;

      const msg = entry.message;
      const role = msg.role;
      const content = Array.isArray(msg.content) ? msg.content : [];
      const ts = msg.timestamp || null;

      if (role === 'user') {
        // Extract text parts (skip system-injected ones)
        const texts = content.filter(c => c.type === 'text').map(c => c.text || '').join('\n');
        if (texts.trim()) {
          messages.push({ role: 'user', text: texts, timestamp: ts });
        }
      } else if (role === 'assistant') {
        const textParts = content.filter(c => c.type === 'text').map(c => c.text || '');
        const toolCalls = content.filter(c => c.type === 'toolCall');
        const text = textParts.join('\n');
        const tools = toolCalls.map(tc => ({
          name: tc.name || tc.toolName || 'tool',
          input: tc.input || tc.arguments || {}
        }));
        messages.push({ role: 'assistant', text, tools, timestamp: ts });
      } else if (role === 'toolResult') {
        // Attach to last assistant message
        const last = messages.filter(m => m.role === 'assistant').pop();
        if (!last) continue;
        if (!last.toolResults) last.toolResults = [];

        const textItems = content.filter(c => c.type === 'text').map(c => c.text || '').join('\n');
        const imageItems = content.filter(c => c.type === 'image');

        const images = imageItems.map(img => ({
          data: img.data || '',
          mimeType: img.mimeType || 'image/png'
        }));

        last.toolResults.push({ text: textItems, images });
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  return messages;
}

// ─── Gateway WS for sending ──────────────────────────────────────────────────

let wsModule;
try { wsModule = require('/opt/homebrew/lib/node_modules/openclaw/node_modules/ws'); }
catch { try { wsModule = require('ws'); } catch { wsModule = null; } }

function sendToGateway(text, callback) {
  if (!wsModule) return callback(new Error('ws module not available'));

  const ws = new wsModule('ws://127.0.0.1:18789', {
    headers: { Origin: 'http://127.0.0.1:18789' }
  });
  let done = false;
  const finish = (err, result) => { if (!done) { done = true; callback(err, result); } };

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.event === 'connect.challenge') {
      const nonce = msg.payload?.nonce ?? '';
      const scopes = ['operator.read', 'operator.write', 'operator.admin'];
      const signedAt = Date.now();
      const signature = signConnectPayload(DEVICE_IDENTITY, { scopes, signedAtMs: signedAt, token: GATEWAY_TOKEN, nonce });
      ws.send(JSON.stringify({
        type: 'req', id: 'c1', method: 'connect',
        params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: 'openclaw-control-ui', version: '2026.2.23', platform: 'macos', mode: 'ui' },
          role: 'operator', scopes, caps: [], commands: [], permissions: {},
          auth: { token: GATEWAY_TOKEN }, locale: 'en-US', userAgent: 'amy-webchat/1.0',
          device: { id: DEVICE_IDENTITY.deviceId, publicKey: DEVICE_IDENTITY.publicKey, signature, signedAt, nonce }
        }
      }));
    } else if (msg.type === 'res' && msg.id === 'c1') {
      if (msg.ok) {
        const idempotencyKey = 'wc-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        ws.send(JSON.stringify({
          type: 'req', id: 's1', method: 'chat.send',
          params: { sessionKey: 'agent:main:main', message: text, deliver: false, idempotencyKey }
        }));
      } else {
        finish(new Error('Connect failed: ' + (msg.error?.code || msg.error?.message)));
        ws.close();
      }
    } else if (msg.type === 'res' && msg.id === 's1') {
      if (msg.ok) { finish(null, msg.payload); } 
      else { finish(new Error(msg.error?.message || 'Send failed')); }
      ws.close();
    }
  });

  ws.on('error', (e) => { finish(e); });
  setTimeout(() => { finish(new Error('timeout')); try { ws.close(); } catch {} }, 10000);
}

// ─── File watcher for SSE ────────────────────────────────────────────────────

let lastMtime = 0;
setInterval(() => {
  const sf = getSessionFile();
  if (!sf) return;
  try {
    const stat = fs.statSync(sf);
    if (stat.mtimeMs > lastMtime) {
      lastMtime = stat.mtimeMs;
      const data = JSON.stringify({ type: 'update', ts: Date.now() });
      for (const res of sseClients) {
        try { res.write(`data: ${data}\n\n`); } catch { sseClients.delete(res); }
      }
    }
  } catch {}
}, 800);

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // SSE stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Messages API
  if (pathname === '/api/messages') {
    const sf = getSessionFile();
    if (!sf) { res.writeHead(404); res.end(JSON.stringify({ error: 'No session' })); return; }
    const messages = parseMessages(sf);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages));
    return;
  }

  // Send message
  if (pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        sendToGateway(text, (err, result) => {
          if (err) {
            res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result }));
          }
        });
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  // Serve workspace files
  if (pathname === '/file') {
    const filePath = parsed.query.path;
    if (!filePath) { res.writeHead(400); res.end('Missing path'); return; }
    // Security: only serve from workspace or openclaw dirs
    const abs = path.resolve(filePath);
    const allowed = [WORKSPACE, path.join(process.env.HOME, '.openclaw')];
    if (!allowed.some(d => abs.startsWith(d))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    try {
      const data = fs.readFileSync(abs);
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
    return;
  }

  // Serve static files from webchat dir
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(fs.readFileSync(fullPath));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🌸 Amy Webchat running at http://127.0.0.1:${PORT}\n`);
});
