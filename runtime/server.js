'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadLanguages } = require('./src/registry');
const { compileAndRun } = require('./src/runner');
const { grade } = require('./src/submissions');
const { plan } = require('./src/schedule');
const dbg = require('./src/debug/manager');
const sandbox = require('./src/sandbox');

const PORT = Number(process.env.PORT || 8787);
const STATIC_DIR = path.join(__dirname, '..', 'playground');
const LANGS = loadLanguages();
const MAX_BODY = 4 * 1024 * 1024;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

function send(res, code, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...headers,
  });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > MAX_BODY) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function lang(id) {
  const l = LANGS.get(id);
  if (!l) throw new Error(`unknown language "${id}"`);
  return l;
}

function serveStatic(req, res) {
  const rel = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(STATIC_DIR, rel));
  if (!file.startsWith(STATIC_DIR)) return send(res, 403, 'forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'not found');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = url.pathname;

    if (req.method === 'OPTIONS') return send(res, 204, '');

    if (route === '/api/health') {
      return send(res, 200, { ok: true, sandbox: sandbox.MODE, memMb: sandbox.MEM_MB });
    }

    if (route === '/api/languages') {
      return send(
        res,
        200,
        [...LANGS.values()].map((l) => ({
          id: l.id,
          name: l.name,
          entry: l.entry,
          extensions: l.extensions,
          debugger: l.debugger,
        }))
      );
    }

    if (route === '/api/run' && req.method === 'POST') {
      const b = await readJson(req);
      const r = await compileAndRun(lang(b.language), b.files, { stdin: b.stdin || '' });
      return send(res, 200, r);
    }

    if (route === '/api/submit' && req.method === 'POST') {
      const b = await readJson(req);
      const r = await grade(lang(b.language), b.files, Number(b.tier), b.tests);
      return send(res, 200, r);
    }

    if (route === '/api/schedule' && req.method === 'POST') {
      const b = await readJson(req);
      return send(res, 200, plan(b.items, b.options || {}));
    }

    if (route === '/api/debug/start' && req.method === 'POST') {
      const b = await readJson(req);
      try {
        const s = await dbg.createSession(lang(b.language), b.files);
        return send(res, 200, { sessionId: s.id });
      } catch (e) {
        return send(res, 400, { error: e.message, build: e.build || null });
      }
    }

    if (route === '/api/debug/events') {
      const id = url.searchParams.get('session');
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      const push = (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`);
      if (!dbg.subscribe(id, push)) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'no such session' })}\n\n`);
        return res.end();
      }
      const ka = setInterval(() => res.write(': keep-alive\n\n'), 15000);
      req.on('close', () => {
        clearInterval(ka);
        dbg.unsubscribe(id, push);
      });
      return;
    }

    if (route === '/api/debug/command' && req.method === 'POST') {
      const b = await readJson(req);
      const out = await dbg.command(b.session, b.command, b.args || {});
      return send(res, 200, out || {});
    }

    if (route === '/api/debug/stop' && req.method === 'POST') {
      const b = await readJson(req);
      await dbg.destroy(b.session);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET') return serveStatic(req, res);
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`[runtime] listening on http://localhost:${PORT}`);
  console.log(`[runtime] sandbox mode: ${sandbox.MODE} (mem ${sandbox.MEM_MB} MB)`);
  if (sandbox.MODE === 'local') {
    console.warn(
      '[runtime] WARNING: local sandbox runs submitted code on this host with ' +
        'only ulimit/timeout limits. Install Docker or set SANDBOX=docker for isolation.'
    );
  }
});
