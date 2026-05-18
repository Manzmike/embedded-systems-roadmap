'use strict';

const { spawn, spawnSync } = require('child_process');

const MEM_MB = Number(process.env.SANDBOX_MEM_MB || 256);
const TIMEOUT_MS = Number(process.env.SANDBOX_TIMEOUT_MS || 15000);

function dockerAvailable() {
  try {
    return spawnSync('docker', ['version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

function sandboxMode() {
  const explicit = (process.env.SANDBOX || '').toLowerCase();
  if (explicit === 'docker' || explicit === 'local') return explicit;
  return dockerAvailable() ? 'docker' : 'local';
}

const MODE = sandboxMode();

// Build the argv that actually gets spawned. In docker mode the command runs
// in a network-isolated, memory/pid-capped, no-new-privileges container with
// the workspace bind-mounted read-write at /work. In local mode the command
// is wrapped with ulimit; user content only ever reaches argv as validated
// file names, never interpolated into a shell string.
function wrap(cmd, { cwd, image, interactive }) {
  if (MODE === 'docker') {
    const args = [
      'run', '--rm', interactive ? '-i' : '--init',
      '--network=none',
      '--memory', `${MEM_MB}m`,
      '--memory-swap', `${MEM_MB}m`,
      '--pids-limit', '128',
      '--cpus', '1',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--tmpfs', '/tmp:exec,size=64m',
      '-v', `${cwd}:/work`,
      '-w', '/work',
      image || 'gcc:13',
      ...cmd,
    ];
    return { file: 'docker', args };
  }
  const memKb = MEM_MB * 1024;
  const timeoutSec = Math.ceil(TIMEOUT_MS / 1000);
  const script =
    'cd "$1" && shift && ' +
    `ulimit -v ${memKb} 2>/dev/null; ulimit -t ${timeoutSec} 2>/dev/null; ` +
    'exec "$@"';
  return { file: 'bash', args: ['-c', script, 'bash', cwd, ...cmd] };
}

function run(cmd, opts = {}) {
  const { file, args } = wrap(cmd, opts);
  return new Promise((resolve) => {
    const child = spawn(file, args, { cwd: opts.cwd });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const cap = (s, chunk) => (s.length > 256 * 1024 ? s : s + chunk);
    child.stdout.on('data', (d) => (stdout = cap(stdout, d.toString())));
    child.stderr.on('data', (d) => (stderr = cap(stderr, d.toString())));
    if (opts.stdin != null) {
      child.stdin.write(opts.stdin);
      child.stdin.end();
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs || TIMEOUT_MS);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + String(err), timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

// Long-lived interactive process (used by debuggers).
function spawnInteractive(cmd, opts = {}) {
  const { file, args } = wrap(cmd, { ...opts, interactive: true });
  return spawn(file, args, { cwd: opts.cwd });
}

module.exports = { run, spawnInteractive, MODE, MEM_MB, TIMEOUT_MS };
