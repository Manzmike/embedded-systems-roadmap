'use strict';

const { EventEmitter } = require('events');
const sandbox = require('../sandbox');
const { OUT_BIN } = require('../runner');

// GDB/MI adapter. Drives `gdb --interpreter=mi3` over stdin and parses the
// machine interface so it works for any gdb-debuggable language (C, C++,
// Rust, ...). The binary must already be built into `dir`.
class GdbDebugger extends EventEmitter {
  constructor(lang, dir) {
    super();
    this.lang = lang;
    this.dir = dir;
    this.proc = null;
    this.token = 0;
    this.pending = new Map();
    this.buf = '';
  }

  async start() {
    this.proc = sandbox.spawnInteractive(
      ['gdb', '--interpreter=mi3', '--quiet', `./${OUT_BIN}`],
      { cwd: this.dir, image: this.lang.debugImage }
    );
    this.proc.stdout.on('data', (d) => this._ingest(d.toString()));
    this.proc.stderr.on('data', (d) =>
      this.emit('event', { type: 'output', stream: 'stderr', text: d.toString() })
    );
    this.proc.on('close', () =>
      this.emit('event', { type: 'terminated' })
    );
    this.proc.on('error', (e) =>
      this.emit('event', { type: 'error', message: String(e) })
    );
    await this._mi('-gdb-set mi-async on');
    await this._mi('-gdb-set print pretty on');
    this.emit('event', { type: 'initialized' });
  }

  async command(name, args = {}) {
    switch (name) {
      case 'setBreakpoints': {
        const ids = [];
        for (const line of args.lines || []) {
          const r = await this._mi(`-break-insert ${args.file}:${line}`);
          if (r.bkpt) ids.push(Number(r.bkpt.number));
        }
        return { breakpoints: ids };
      }
      case 'launch':
        this._mi('-exec-run');
        return { running: true };
      case 'continue':
        this._mi('-exec-continue');
        return { running: true };
      case 'next':
        this._mi('-exec-next');
        return { running: true };
      case 'stepIn':
        this._mi('-exec-step');
        return { running: true };
      case 'stepOut':
        this._mi('-exec-finish');
        return { running: true };
      case 'pause':
        return this._mi('-exec-interrupt');
      case 'stackTrace': {
        const r = await this._mi('-stack-list-frames');
        return { frames: this._frames(r.stack) };
      }
      case 'variables': {
        const r = await this._mi('-stack-list-variables --simple-values');
        return { variables: this._vars(r.variables) };
      }
      case 'evaluate': {
        const expr = String(args.expression || '').replace(/"/g, '\\"');
        const r = await this._mi(`-data-evaluate-expression "${expr}"`);
        return { result: r.value };
      }
      default:
        return { error: `unknown command ${name}` };
    }
  }

  async stop() {
    if (!this.proc) return;
    try {
      this._send('-gdb-exit');
    } catch {
      /* ignore */
    }
    this.proc.kill('SIGKILL');
    this.proc = null;
  }

  _send(line) {
    if (this.proc && this.proc.stdin.writable) this.proc.stdin.write(line + '\n');
  }

  _mi(cmd) {
    const tok = ++this.token;
    return new Promise((resolve) => {
      this.pending.set(tok, resolve);
      this._send(`${tok}${cmd}`);
      setTimeout(() => {
        if (this.pending.has(tok)) {
          this.pending.delete(tok);
          resolve({ _timeout: true });
        }
      }, 10000);
    });
  }

  _ingest(chunk) {
    this.buf += chunk;
    let nl;
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).replace(/\r$/, '');
      this.buf = this.buf.slice(nl + 1);
      if (line && line !== '(gdb)') this._line(line);
    }
  }

  _line(line) {
    const m = /^(\d*)([\^*+=~@&])(.*)$/.exec(line);
    if (!m) return;
    const [, tokStr, kind, rest] = m;

    if (kind === '~' || kind === '@') {
      this.emit('event', { type: 'output', stream: 'stdout', text: unquote(rest) });
      return;
    }
    if (kind === '&') return; // gdb log stream

    const comma = rest.indexOf(',');
    const klass = comma < 0 ? rest : rest.slice(0, comma);
    const payload = comma < 0 ? {} : parseMI(rest.slice(comma + 1));

    if (kind === '^') {
      const tok = Number(tokStr);
      const resolver = this.pending.get(tok);
      if (resolver) {
        this.pending.delete(tok);
        resolver(klass === 'error' ? { error: payload.msg } : payload);
      }
      if (klass === 'error') {
        this.emit('event', { type: 'error', message: payload.msg });
      }
      return;
    }
    if (kind === '*' && klass === 'stopped') {
      const f = payload.frame || {};
      if (payload.reason && payload.reason.startsWith('exited')) {
        this.emit('event', { type: 'exited', code: payload['exit-code'] || '0' });
      } else {
        this.emit('event', {
          type: 'stopped',
          reason: payload.reason || 'stopped',
          file: f.fullname || f.file,
          line: f.line ? Number(f.line) : null,
          func: f.func,
        });
      }
      return;
    }
    if (kind === '*' && klass === 'running') {
      this.emit('event', { type: 'running' });
    }
  }

  _frames(stack) {
    const list = Array.isArray(stack) ? stack : stack ? [stack] : [];
    return list.map((e) => {
      const fr = e.frame || e;
      return { level: Number(fr.level || 0), func: fr.func, file: fr.file, line: fr.line ? Number(fr.line) : null };
    });
  }

  _vars(vars) {
    const list = Array.isArray(vars) ? vars : vars ? [vars] : [];
    return list.map((v) => ({ name: v.name, value: v.value }));
  }
}

// --- Minimal GDB/MI value parser (c-string, tuple {}, list []) ---
function unquote(s) {
  const t = s.trim().replace(/^"|"$/g, '');
  return t.replace(/\\(.)/g, (_, c) =>
    c === 'n' ? '\n' : c === 't' ? '\t' : c
  );
}

function parseMI(str) {
  let i = 0;
  function value() {
    if (str[i] === '"') return cstring();
    if (str[i] === '{') return tuple();
    if (str[i] === '[') return list();
    return cstring();
  }
  function cstring() {
    if (str[i] !== '"') {
      let s = i;
      while (i < str.length && !',{}[]'.includes(str[i])) i++;
      return str.slice(s, i);
    }
    i++;
    let s = '';
    while (i < str.length && str[i] !== '"') {
      if (str[i] === '\\') {
        const c = str[++i];
        s += c === 'n' ? '\n' : c === 't' ? '\t' : c;
      } else s += str[i];
      i++;
    }
    i++;
    return s;
  }
  function result() {
    let s = i;
    while (i < str.length && str[i] !== '=') i++;
    const key = str.slice(s, i);
    i++;
    return [key, value()];
  }
  function tuple() {
    i++;
    const obj = {};
    while (i < str.length && str[i] !== '}') {
      const [k, v] = result();
      obj[k] = v;
      if (str[i] === ',') i++;
    }
    i++;
    return obj;
  }
  function list() {
    i++;
    const arr = [];
    while (i < str.length && str[i] !== ']') {
      if (/[A-Za-z_-]/.test(str[i]) && str.indexOf('=', i) >= 0) {
        const probe = i;
        while (i < str.length && !'=,]'.includes(str[i])) i++;
        if (str[i] === '=') {
          i = probe;
          const [k, v] = result();
          arr.push({ [k]: v });
        } else {
          i = probe;
          arr.push(value());
        }
      } else {
        arr.push(value());
      }
      if (str[i] === ',') i++;
    }
    i++;
    return arr;
  }
  const out = {};
  while (i < str.length) {
    const [k, v] = result();
    out[k] = v;
    if (str[i] === ',') i++;
    else break;
  }
  return out;
}

module.exports = { GdbDebugger };
