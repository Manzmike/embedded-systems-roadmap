'use strict';

const { EventEmitter } = require('events');
const sandbox = require('../sandbox');

// Python pdb adapter. Uses the stdlib debugger (no pip install needed) and
// drives it line-by-line, synchronizing on the "(Pdb) " prompt.
class PdbDebugger extends EventEmitter {
  constructor(lang, dir) {
    super();
    this.lang = lang;
    this.dir = dir;
    this.proc = null;
    this.buf = '';
    this.queue = [];
    this.waiter = null;
  }

  async start() {
    this.proc = sandbox.spawnInteractive(
      ['python3', '-u', '-m', 'pdb', this.lang.entry],
      { cwd: this.dir, image: this.lang.debugImage }
    );
    this.proc.stdout.on('data', (d) => this._ingest(d.toString()));
    this.proc.stderr.on('data', (d) =>
      this.emit('event', { type: 'output', stream: 'stderr', text: d.toString() })
    );
    this.proc.on('close', () => this.emit('event', { type: 'terminated' }));
    this.proc.on('error', (e) =>
      this.emit('event', { type: 'error', message: String(e) })
    );
    await this._until();
    this.emit('event', { type: 'initialized' });
  }

  async command(name, args = {}) {
    switch (name) {
      case 'setBreakpoints': {
        for (const line of args.lines || []) {
          await this._cmd(`break ${this.lang.entry}:${line}`);
        }
        return { ok: true };
      }
      case 'launch':
      case 'continue':
        return this._step('continue');
      case 'next':
        return this._step('next');
      case 'stepIn':
        return this._step('step');
      case 'stepOut':
        return this._step('return');
      case 'stackTrace': {
        const out = await this._cmd('where');
        return { frames: out };
      }
      case 'variables': {
        const vals = await this._cmd('pp locals()');
        return { variables: [{ name: 'locals', value: vals }] };
      }
      case 'evaluate':
        return { result: await this._cmd(`p ${args.expression}`) };
      default:
        return { error: `unknown command ${name}` };
    }
  }

  async _step(verb) {
    const out = await this._cmd(verb);
    const loc = /> .*\((\d+)\)/.exec(out) || /\((\d+)\)<module>/.exec(out);
    if (/The program finished|SystemExit|Bdb quit/.test(out)) {
      this.emit('event', { type: 'exited', code: '0' });
    } else {
      this.emit('event', {
        type: 'stopped',
        reason: verb,
        file: this.lang.entry,
        line: loc ? Number(loc[1]) : null,
      });
    }
    return { output: out };
  }

  async stop() {
    if (!this.proc) return;
    this.proc.kill('SIGKILL');
    this.proc = null;
  }

  _ingest(chunk) {
    this.buf += chunk;
    if (this.buf.includes('(Pdb) ')) {
      const idx = this.buf.lastIndexOf('(Pdb) ');
      const text = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 6);
      const w = this.waiter;
      this.waiter = null;
      if (w) w(text);
      else this.queue.push(text);
    }
  }

  _until() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise((res) => (this.waiter = res));
  }

  _cmd(line) {
    if (this.proc && this.proc.stdin.writable) this.proc.stdin.write(line + '\n');
    return this._until();
  }
}

module.exports = { PdbDebugger };
