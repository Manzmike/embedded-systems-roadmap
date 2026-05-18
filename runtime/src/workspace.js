'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'workspaces');
const MAX_FILES = 50;
const MAX_BYTES = 2 * 1024 * 1024;
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9._-])?$/;

function safeName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    return false;
  }
  if (name.includes('..') || name.startsWith('/') || name.includes('\\')) {
    return false;
  }
  return NAME_RE.test(name);
}

// Materialize an untrusted set of {name, content} files into an isolated
// workspace directory. Every name is validated against path traversal.
function createWorkspace(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('at least one file is required');
  }
  if (files.length > MAX_FILES) {
    throw new Error(`too many files (max ${MAX_FILES})`);
  }
  let total = 0;
  for (const f of files) {
    if (!f || !safeName(f.name)) {
      throw new Error(`invalid file name: ${f && f.name}`);
    }
    if (typeof f.content !== 'string') {
      throw new Error(`file ${f.name} has no string content`);
    }
    total += Buffer.byteLength(f.content, 'utf8');
  }
  if (total > MAX_BYTES) {
    throw new Error(`workspace too large (max ${MAX_BYTES} bytes)`);
  }

  fs.mkdirSync(ROOT, { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, 'ws-'));
  const real = fs.realpathSync(dir);
  for (const f of files) {
    const dest = path.resolve(real, f.name);
    if (dest !== real && !dest.startsWith(real + path.sep)) {
      throw new Error(`file escapes workspace: ${f.name}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.content, { mode: 0o600 });
  }
  return real;
}

function destroyWorkspace(dir) {
  if (!dir) return;
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(ROOT) + path.sep)) return;
  fs.rmSync(resolved, { recursive: true, force: true });
}

module.exports = { createWorkspace, destroyWorkspace, safeName, ROOT };
