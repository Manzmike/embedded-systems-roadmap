'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { compileAndRun } = require('./runner');

const TIERS = {
  1: 'Beginning',
  2: 'Middle',
  3: 'Hard',
  4: 'Mastery',
  5: 'Mastery Confirmed',
};
const GATE_TIER = 5;

const STORE = path.join(__dirname, '..', 'workspaces', 'submissions');

function normalize(s) {
  return String(s == null ? '' : s).replace(/\r\n/g, '\n').replace(/\s+$/g, '');
}

// Grade one tier submission. `tests` is an optional array of
// { name, stdin, expectedStdout }. With no tests, a clean compile + exit 0
// is the bar. Tier 5 is the mastery gate the curriculum advances on.
async function grade(lang, files, tier, tests) {
  if (!TIERS[tier]) throw new Error(`unknown tier ${tier}`);
  const cases = Array.isArray(tests) && tests.length ? tests : [{ name: 'compile-and-run', stdin: '' }];
  const results = [];
  let passed = 0;

  for (const tc of cases) {
    const r = await compileAndRun(lang, files, { stdin: tc.stdin || '' });
    if (r.stage === 'build' && r.build && r.build.code !== 0) {
      results.push({ name: tc.name, pass: false, reason: 'build failed', detail: r.build.stderr });
      continue;
    }
    const out = r.run ? r.run.stdout : '';
    let pass = r.ok;
    let reason = r.run && r.run.timedOut ? 'timed out' : r.ok ? 'ok' : 'non-zero exit';
    if (tc.expectedStdout != null) {
      pass = normalize(out) === normalize(tc.expectedStdout);
      reason = pass ? 'output matched' : 'output mismatch';
    }
    if (pass) passed += 1;
    results.push({
      name: tc.name,
      pass,
      reason,
      stdout: out,
      stderr: r.run ? r.run.stderr : '',
    });
  }

  const allPass = passed === cases.length;
  const record = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    language: lang.id,
    tier,
    tierName: TIERS[tier],
    isGate: tier === GATE_TIER,
    passed: allPass,
    casesPassed: passed,
    casesTotal: cases.length,
    results,
    masteryConfirmed: tier === GATE_TIER && allPass,
    advances: tier === GATE_TIER && allPass,
  };
  persist(record);
  return record;
}

function persist(record) {
  try {
    fs.mkdirSync(STORE, { recursive: true });
    fs.writeFileSync(
      path.join(STORE, `${record.at.replace(/[:.]/g, '-')}_${record.id}.json`),
      JSON.stringify(record, null, 2)
    );
  } catch {
    /* submission log is best-effort */
  }
}

module.exports = { grade, TIERS, GATE_TIER };
