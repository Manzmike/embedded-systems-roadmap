'use strict';

const fs = require('fs');
const path = require('path');

const LANG_DIR = path.join(__dirname, '..', 'languages');
const REQUIRED = ['id', 'name', 'extensions', 'entry', 'run'];

function loadLanguages() {
  const langs = new Map();
  for (const file of fs.readdirSync(LANG_DIR)) {
    if (!file.endsWith('.json')) continue;
    const def = JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), 'utf8'));
    for (const key of REQUIRED) {
      if (def[key] === undefined) {
        throw new Error(`language ${file} missing required field "${key}"`);
      }
    }
    def.build = def.build || [];
    def.debugger = def.debugger || 'none';
    def.image = def.image || null;
    def.debugImage = def.debugImage || def.image;
    langs.set(def.id, def);
  }
  if (langs.size === 0) throw new Error('no languages registered');
  return langs;
}

// Resolve {tokens} in a command array. Tokens that expand to a file list
// (e.g. {files:.c}) are spliced in place; scalar tokens are string-replaced.
// User content never enters the command string, only validated file names.
function expandCommand(cmd, ctx) {
  const out = [];
  for (const raw of cmd) {
    const listMatch = /^\{files(?::([^}]+))?\}$/.exec(raw);
    if (listMatch) {
      const exts = listMatch[1] ? listMatch[1].split(',') : null;
      const picked = ctx.files.filter(
        (f) => !exts || exts.some((e) => f.endsWith(e.trim()))
      );
      out.push(...picked);
      continue;
    }
    out.push(
      raw
        .replace(/\{out\}/g, ctx.out)
        .replace(/\{entry\}/g, ctx.entry)
        .replace(/\{workspace\}/g, ctx.workspace)
    );
  }
  return out;
}

module.exports = { loadLanguages, expandCommand };
