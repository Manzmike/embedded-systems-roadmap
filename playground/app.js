'use strict';

const $ = (s) => document.querySelector(s);

const STARTERS = {
  c: '#include <stdio.h>\n\nint main(void) {\n    int n = 3;\n    for (int i = 0; i < n; i++) {\n        printf("hello %d\\n", i);\n    }\n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    for (int i = 0; i < 3; ++i) {\n        std::cout << "hello " << i << "\\n";\n    }\n    return 0;\n}\n',
  python: 'def main():\n    for i in range(3):\n        print(f"hello {i}")\n\n\nif __name__ == "__main__":\n    main()\n',
  javascript: 'function main() {\n  for (let i = 0; i < 3; i++) {\n    console.log(`hello ${i}`);\n  }\n}\n\nmain();\n',
  rust: 'fn main() {\n    for i in 0..3 {\n        println!("hello {}", i);\n    }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfor i := 0; i < 3; i++ {\n\t\tfmt.Printf("hello %d\\n", i)\n\t}\n}\n',
};

const state = {
  api: '',
  languages: [],
  lang: null,
  files: [],
  active: 0,
  breakpoints: new Set(),
  session: null,
  events: null,
  curLine: null,
};

function api(path) {
  return state.api.replace(/\/$/, '') + path;
}

async function checkHealth() {
  try {
    const r = await fetch(api('/api/health'));
    const j = await r.json();
    $('#status').textContent = `connected · sandbox: ${j.sandbox}`;
    $('#status').className = 'status ok';
    return true;
  } catch {
    $('#status').textContent = 'runtime unreachable';
    $('#status').className = 'status bad';
    return false;
  }
}

async function loadLanguages() {
  const r = await fetch(api('/api/languages'));
  state.languages = await r.json();
  const sel = $('#language');
  sel.innerHTML = '';
  for (const l of state.languages) {
    const o = document.createElement('option');
    o.value = l.id;
    o.textContent = l.name + (l.debugger === 'none' ? ' (run only)' : '');
    sel.appendChild(o);
  }
  selectLanguage(state.languages[0].id);
}

function selectLanguage(id) {
  state.lang = state.languages.find((l) => l.id === id);
  $('#language').value = id;
  state.files = [{ name: state.lang.entry, content: STARTERS[id] || '' }];
  state.active = 0;
  state.breakpoints.clear();
  renderFileTabs();
  renderEditor();
}

function renderFileTabs() {
  const box = $('#fileTabs');
  box.innerHTML = '';
  state.files.forEach((f, i) => {
    const t = document.createElement('div');
    t.className = 'file-tab' + (i === state.active ? ' active' : '');
    t.textContent = f.name;
    t.onclick = () => {
      saveActive();
      state.active = i;
      renderFileTabs();
      renderEditor();
    };
    if (state.files.length > 1) {
      const x = document.createElement('span');
      x.textContent = '×';
      x.onclick = (e) => {
        e.stopPropagation();
        state.files.splice(i, 1);
        state.active = 0;
        renderFileTabs();
        renderEditor();
      };
      t.appendChild(x);
    }
    box.appendChild(t);
  });
}

function saveActive() {
  state.files[state.active].content = $('#code').value;
}

function renderEditor() {
  $('#code').value = state.files[state.active].content;
  renderGutter();
}

function renderGutter() {
  const lines = $('#code').value.split('\n').length;
  const g = $('#gutter');
  g.innerHTML = '';
  for (let i = 1; i <= lines; i++) {
    const d = document.createElement('div');
    d.textContent = i;
    if (state.breakpoints.has(i)) d.classList.add('bp');
    if (state.curLine === i) d.classList.add('cur');
    d.onclick = () => {
      if (state.breakpoints.has(i)) state.breakpoints.delete(i);
      else state.breakpoints.add(i);
      renderGutter();
    };
    g.appendChild(d);
  }
}

function payloadFiles() {
  saveActive();
  return state.files.map((f) => ({ name: f.name, content: f.content }));
}

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    $(`.view[data-view="${btn.dataset.tab}"]`).classList.remove('hidden');
  };
});

/* ---------- Playground ---------- */
$('#runBtn').onclick = async () => {
  const box = $('#runResult');
  box.textContent = 'running…';
  try {
    const r = await fetch(api('/api/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.lang.id,
        files: payloadFiles(),
        stdin: $('#pgStdin').value,
      }),
    });
    const j = await r.json();
    box.innerHTML = renderRun(j);
  } catch (e) {
    box.textContent = 'error: ' + e.message;
  }
};

function renderRun(j) {
  let h = '';
  if (j.build) {
    h += `<h3>Build (${j.build.code === 0 ? 'ok' : 'failed'})</h3>`;
    if (j.build.stderr) h += `<pre class="out">${esc(j.build.stderr)}</pre>`;
  }
  if (j.run) {
    h += `<h3>Program ${j.run.timedOut ? '(timed out)' : 'exit ' + j.run.code}</h3>`;
    if (j.run.stdout) h += `<pre class="out">${esc(j.run.stdout)}</pre>`;
    if (j.run.stderr) h += `<pre class="out">${esc(j.run.stderr)}</pre>`;
  }
  if (j.error) h += `<pre class="out">${esc(j.error)}</pre>`;
  return h || 'no output';
}

/* ---------- Submit ---------- */
function addCase() {
  const wrap = document.createElement('div');
  wrap.className = 'case';
  wrap.innerHTML =
    '<span class="rm">remove</span>' +
    '<label>stdin<textarea class="cin" rows="2" spellcheck="false"></textarea></label>' +
    '<label>expected stdout<textarea class="cout" rows="2" spellcheck="false"></textarea></label>';
  wrap.querySelector('.rm').onclick = () => wrap.remove();
  $('#cases').appendChild(wrap);
}
$('#addCase').onclick = addCase;

$('#submitBtn').onclick = async () => {
  const box = $('#submitResult');
  const tests = [...document.querySelectorAll('.case')].map((c, i) => {
    const exp = c.querySelector('.cout').value;
    return {
      name: `case ${i + 1}`,
      stdin: c.querySelector('.cin').value,
      expectedStdout: exp === '' ? null : exp,
    };
  });
  box.textContent = 'grading…';
  try {
    const r = await fetch(api('/api/submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.lang.id,
        files: payloadFiles(),
        tier: Number($('#tier').value),
        tests,
      }),
    });
    box.innerHTML = renderGrade(await r.json());
  } catch (e) {
    box.textContent = 'error: ' + e.message;
  }
};

function renderGrade(j) {
  if (j.error) return `<pre class="out">${esc(j.error)}</pre>`;
  let h = `<p><b>Tier ${j.tier} — ${j.tierName}</b> · ` +
    `${j.casesPassed}/${j.casesTotal} cases</p>`;
  h += j.results
    .map(
      (r) =>
        `<p><span class="badge ${r.pass ? 'pass' : 'fail'}">${
          r.pass ? 'PASS' : 'FAIL'
        }</span> ${esc(r.name)} — ${esc(r.reason)}</p>` +
        (r.stdout ? `<pre class="out">${esc(r.stdout)}</pre>` : '') +
        (r.detail ? `<pre class="out">${esc(r.detail)}</pre>` : '')
    )
    .join('');
  if (j.isGate) {
    h += `<div class="gate ${j.masteryConfirmed ? 'pass' : 'fail'}">${
      j.masteryConfirmed
        ? 'Mastery Confirmed — the week advances.'
        : 'Tier 5 gate not passed. The week does not advance until this is clean.'
    }</div>`;
  }
  return h;
}

/* ---------- Debugger ---------- */
const dlog = (t) => {
  $('#dbgConsole').textContent += t;
  $('#dbgConsole').scrollTop = $('#dbgConsole').scrollHeight;
};

function dbgButtons(active) {
  ['#dbgContinue', '#dbgNext', '#dbgStepIn', '#dbgStepOut', '#dbgStop', '#dbgEval'].forEach(
    (s) => ($(s).disabled = !active)
  );
  $('#dbgStart').disabled = active;
}

$('#dbgStart').onclick = async () => {
  $('#dbgConsole').textContent = '';
  try {
    const r = await fetch(api('/api/debug/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: state.lang.id, files: payloadFiles() }),
    });
    const j = await r.json();
    if (j.error) {
      dlog('start failed: ' + j.error + '\n');
      if (j.build && j.build.stderr) dlog(j.build.stderr + '\n');
      return;
    }
    state.session = j.sessionId;
    dbgButtons(true);
    openEvents();
    await dbgCmd('setBreakpoints', {
      file: state.lang.entry,
      lines: [...state.breakpoints],
    });
    await dbgCmd('launch', {});
  } catch (e) {
    dlog('error: ' + e.message + '\n');
  }
};

function openEvents() {
  state.events = new EventSource(api('/api/debug/events?session=' + state.session));
  state.events.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    if (ev.type === 'output') dlog(ev.text);
    else if (ev.type === 'stopped') {
      dlog(`■ stopped (${ev.reason}) at ${ev.file || ''}:${ev.line || '?'}\n`);
      state.curLine = ev.line;
      renderGutter();
      refreshStackVars();
    } else if (ev.type === 'running') dlog('▶ running…\n');
    else if (ev.type === 'exited') {
      dlog(`● program exited (${ev.code})\n`);
      state.curLine = null;
      renderGutter();
    } else if (ev.type === 'terminated') {
      dlog('● debug session ended\n');
      endDebug();
    } else if (ev.type === 'error') dlog('error: ' + ev.message + '\n');
  };
  state.events.onerror = () => {};
}

async function dbgCmd(command, args) {
  const r = await fetch(api('/api/debug/command'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: state.session, command, args: args || {} }),
  });
  return r.json();
}

async function refreshStackVars() {
  const st = await dbgCmd('stackTrace', {});
  $('#dbgStack').innerHTML = '';
  if (Array.isArray(st.frames)) {
    st.frames.forEach((f) => {
      const li = document.createElement('li');
      li.textContent = `${f.func || '?'} — ${f.file || ''}:${f.line || ''}`;
      $('#dbgStack').appendChild(li);
    });
  } else if (typeof st.frames === 'string') {
    $('#dbgStack').innerHTML = `<li><pre class="out">${esc(st.frames)}</pre></li>`;
  }
  const v = await dbgCmd('variables', {});
  $('#dbgVars').innerHTML = '';
  (v.variables || []).forEach((x) => {
    const li = document.createElement('li');
    li.textContent = `${x.name} = ${x.value}`;
    $('#dbgVars').appendChild(li);
  });
}

$('#dbgContinue').onclick = () => dbgCmd('continue', {});
$('#dbgNext').onclick = () => dbgCmd('next', {});
$('#dbgStepIn').onclick = () => dbgCmd('stepIn', {});
$('#dbgStepOut').onclick = () => dbgCmd('stepOut', {});
$('#dbgEval').onclick = async () => {
  const out = await dbgCmd('evaluate', { expression: $('#dbgExpr').value });
  dlog(`eval: ${$('#dbgExpr').value} => ${out.result ?? out.error ?? ''}\n`);
};
$('#dbgStop').onclick = async () => {
  if (state.session) await fetch(api('/api/debug/stop'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: state.session }),
  });
  endDebug();
};

function endDebug() {
  if (state.events) state.events.close();
  state.events = null;
  state.session = null;
  state.curLine = null;
  renderGutter();
  dbgButtons(false);
}

/* ---------- Wiring ---------- */
$('#code').addEventListener('input', () => {
  saveActive();
  renderGutter();
});
$('#code').addEventListener('scroll', () => {
  $('#gutter').scrollTop = $('#code').scrollTop;
});
$('#language').onchange = (e) => selectLanguage(e.target.value);
$('#addFile').onclick = () => {
  const name = prompt('File name', 'util' + (state.lang.extensions[0] || '.txt'));
  if (!name) return;
  saveActive();
  state.files.push({ name, content: '' });
  state.active = state.files.length - 1;
  renderFileTabs();
  renderEditor();
};
$('#apiBase').onchange = async (e) => {
  state.api = e.target.value.trim();
  localStorage.setItem('roadmap-api', state.api);
  if (await checkHealth()) loadLanguages();
};

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

(async function init() {
  state.api =
    localStorage.getItem('roadmap-api') ||
    (location.protocol.startsWith('http') ? location.origin : 'http://localhost:8787');
  $('#apiBase').value = state.api;
  addCase();
  if (await checkHealth()) await loadLanguages();
})();
