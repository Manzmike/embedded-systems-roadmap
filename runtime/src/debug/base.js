'use strict';

const { EventEmitter } = require('events');

// Adapter contract: extend EventEmitter, emit {type,...} via 'event',
// implement start(), command(name, args), stop(). The null adapter is used
// for languages whose registry entry sets "debugger": "none".
class BaseDebugger extends EventEmitter {
  constructor(lang) {
    super();
    this.lang = lang;
  }

  async start() {
    this.emit('event', {
      type: 'error',
      message: `Debugging is not configured for ${this.lang.name}. ` +
        `Set "debugger" to "gdb" or "pdb" in languages/${this.lang.id}.json.`,
    });
    this.emit('event', { type: 'terminated' });
  }

  async command() {
    this.emit('event', { type: 'error', message: 'debugger not available' });
  }

  async stop() {}
}

module.exports = { BaseDebugger };
