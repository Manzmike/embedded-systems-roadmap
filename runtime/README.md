# Runtime

Sandboxed multi-language **compile / run / debug / submission** service for the
roadmap playground. It is intentionally a *separate* process from the
curriculum content — start it on demand, point the web app at it.

No npm dependencies. Node 20+ and (recommended) Docker are the only
requirements.

## Run

```bash
cd runtime
node server.js
# -> http://localhost:8787  (also serves the ../playground front-end)
```

Then open `http://localhost:8787` or open `playground/index.html` directly and
set the runtime URL in the header.

## Sandbox

| Mode | When | Isolation |
|---|---|---|
| `docker` | default if Docker is installed | network-disabled, memory/PID/CPU capped, `--cap-drop ALL`, `no-new-privileges`, workspace bind-mounted |
| `local` | fallback if Docker is absent | `ulimit` memory + CPU-time + wall-clock timeout only — **runs submitted code on the host** |

Force a mode with `SANDBOX=docker` or `SANDBOX=local`. Tunables:
`PORT`, `SANDBOX_MEM_MB` (default 256), `SANDBOX_TIMEOUT_MS` (default 15000).

Docker mode pulls the image named in each language file on first use.

## Adding a language

Drop a JSON file in `languages/`. Any language is just config:

```json
{
  "id": "zig",
  "name": "Zig",
  "extensions": [".zig"],
  "entry": "main.zig",
  "image": "ziglang/zig:latest",
  "build": ["zig", "build-exe", "-femit-bin={out}", "{entry}"],
  "run": ["{out}"],
  "debugger": "gdb"
}
```

Command tokens: `{out}` (built binary), `{entry}` (entry file), `{workspace}`,
`{files}` (all sources), `{files:.c,.h}` (sources filtered by extension).
`debugger` is `gdb`, `pdb`, or `none`. User code only ever reaches argv as
validated file names — never interpolated into a shell string.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + sandbox mode |
| GET | `/api/languages` | registered languages |
| POST | `/api/run` | `{language, files[], stdin}` → build + run |
| POST | `/api/submit` | `{language, files[], tier, tests[]}` → tier grade (Tier 5 = mastery gate) |
| POST | `/api/debug/start` | `{language, files[]}` → `{sessionId}` |
| GET | `/api/debug/events?session=` | SSE stream of debug events |
| POST | `/api/debug/command` | `{session, command, args}` (setBreakpoints, launch, continue, next, stepIn, stepOut, stackTrace, variables, evaluate) |
| POST | `/api/debug/stop` | end session |

`files` is `[{ "name": "main.c", "content": "..." }]` — multi-file projects are
compiled together per the language's build command.
