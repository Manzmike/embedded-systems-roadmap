'use strict';

const crypto = require('crypto');
const { expandCommand } = require('../registry');
const { createWorkspace, destroyWorkspace } = require('../workspace');
const { buildContext } = require('../runner');
const sandbox = require('../sandbox');
const { BaseDebugger } = require('./base');
const { GdbDebugger } = require('./gdbmi');
const { PdbDebugger } = require('./pdb');

const sessions = new Map();

function pickAdapter(lang, dir) {
  switch (lang.debugger) {
    case 'gdb':
      return new GdbDebugger(lang, dir);
    case 'pdb':
      return new PdbDebugger(lang, dir);
    default:
      return new BaseDebugger(lang);
  }
}

// Create a debug session: materialize the workspace, compile if the language
// needs a binary, then attach the registry-selected adapter. Adapter events
// are buffered so an SSE client that connects a moment later sees them.
async function createSession(lang, files) {
  const dir = createWorkspace(files);
  const id = crypto.randomUUID();

  if (lang.build && lang.build.length) {
    const ctx = buildContext(lang, dir, files);
    const build = await sandbox.run(expandCommand(lang.build, ctx), {
      cwd: dir,
      image: lang.image,
    });
    if (build.code !== 0) {
      destroyWorkspace(dir);
      const err = new Error('build failed');
      err.build = build;
      throw err;
    }
  }

  const adapter = pickAdapter(lang, dir);
  const session = { id, dir, adapter, backlog: [], listeners: new Set() };
  adapter.on('event', (ev) => {
    if (session.listeners.size) {
      for (const fn of session.listeners) fn(ev);
    } else {
      session.backlog.push(ev);
    }
  });
  sessions.set(id, session);
  await adapter.start();
  return session;
}

function subscribe(id, fn) {
  const s = sessions.get(id);
  if (!s) return false;
  s.listeners.add(fn);
  while (s.backlog.length) fn(s.backlog.shift());
  return true;
}

function unsubscribe(id, fn) {
  const s = sessions.get(id);
  if (s) s.listeners.delete(fn);
}

async function command(id, name, args) {
  const s = sessions.get(id);
  if (!s) throw new Error('no such session');
  return s.adapter.command(name, args);
}

async function destroy(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  try {
    await s.adapter.stop();
  } finally {
    destroyWorkspace(s.dir);
  }
}

module.exports = { createSession, subscribe, unsubscribe, command, destroy };
