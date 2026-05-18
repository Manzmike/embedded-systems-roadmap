# Playground

Static three-tab web front-end for the code lab. No build step, no
dependencies — it is plain HTML/CSS/JS and talks to the `runtime/` service.

## Tabs

- **Submit** — multi-file submission graded per tier (1 Beginning → 5 Mastery
  Confirmed). Optional stdin/expected-stdout test cases. Tier 5 shows the
  mastery gate verdict that the curriculum advances on.
- **Playground** — free experimentation: edit multiple files, pick any
  registered language, supply stdin, compile and run.
- **Debugger** — click the gutter to set breakpoints, then Start / Continue /
  Step over / Step in / Step out, with live call stack, variables, evaluate,
  and program console (GDB for C/C++/Rust, pdb for Python; languages with
  `"debugger": "none"` are run-only).

## Use

Start the runtime (`cd runtime && node server.js`) and open
`http://localhost:8787`. To open `index.html` from disk instead, set the
runtime URL in the header field — it is remembered in `localStorage`.

Language list, multi-file compilation, and debug capability are all driven by
the runtime's language registry, so anything added there appears here
automatically.
