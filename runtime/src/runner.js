'use strict';

const { expandCommand } = require('./registry');
const { createWorkspace, destroyWorkspace } = require('./workspace');
const sandbox = require('./sandbox');

const OUT_BIN = 'a.out';

function buildContext(lang, dir, files) {
  return {
    out: './' + OUT_BIN,
    entry: lang.entry,
    workspace: sandbox.MODE === 'docker' ? '/work' : dir,
    files: files.map((f) => f.name),
  };
}

// Compile (if the language has a build step) then execute. Returns each
// phase so the UI can show compiler diagnostics separately from program I/O.
async function compileAndRun(lang, files, { stdin = '', keepWorkspace = false } = {}) {
  const dir = createWorkspace(files);
  try {
    const ctx = buildContext(lang, dir, files);
    const result = { workspace: dir, build: null, run: null };

    if (lang.build && lang.build.length) {
      const buildCmd = expandCommand(lang.build, ctx);
      result.build = await sandbox.run(buildCmd, { cwd: dir, image: lang.image });
      if (result.build.code !== 0) {
        result.ok = false;
        result.stage = 'build';
        return result;
      }
    }

    const runCmd = expandCommand(lang.run, ctx);
    result.run = await sandbox.run(runCmd, { cwd: dir, image: lang.image, stdin });
    result.ok = result.run.code === 0 && !result.run.timedOut;
    result.stage = 'run';
    return result;
  } finally {
    if (!keepWorkspace) destroyWorkspace(dir);
  }
}

module.exports = { compileAndRun, buildContext, OUT_BIN };
