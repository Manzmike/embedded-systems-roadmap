# Architecture

A short tour of why the LMS is shaped the way it is. If something is missing
here, it's because it wasn't a decision worth making.

---

## Single-user, RLS-everywhere

There is exactly one user. We still keep `user_id` on every row and enforce
Row Level Security keyed on `auth.uid()`. Two reasons:

1. The Supabase JS client speaks Postgres directly from the browser. Without
   RLS, an `anon` key would let anyone read everything. RLS is the seatbelt.
2. If we ever do extend to a second user (a tutor, a co-learner), the schema
   already supports it.

Service-role access exists only behind API routes (`lib/supabase/admin.ts`)
and is used for cron jobs and `usage_log` inserts that must succeed even when
the user-bound client is not available.

---

## Why API routes for every Claude call

Anthropic API key never leaves the server. Every call funnels through
`lib/anthropic.ts::callClaude`, which:

- Adds the system prompt
- Sends the user prompt
- Logs `usage_log` with token counts and a cost estimate
- Returns text + token counts to the caller

This means every endpoint pays the same cost for monitoring. We don't need
to remember to add logging — the entry point does it.

---

## Generation prompts: deterministic structure

`generate-week` returns `<<<TUTORIAL>>>...<<<PROBLEM>>>...<<<NOTEBOOKLM>>>`
delimited blocks rather than three separate calls. Reasons:

- One Claude round-trip beats three (3x cheaper, 3x faster).
- The model maintains coherent voice across the three artifacts when they
  share a single context.
- Parsing is a simple regex; if it fails, we surface the raw response and the
  endpoint returns 502. The user can re-click without partial state.

Grading prompts return JSON wrapped in a fenced code block. `extractJson`
handles either fenced or raw bodies. If parsing fails the submission stays
in `pending_grade` and the user can retry.

---

## Late policy lives in code, not in the model

`lib/utils.ts::latePenalty` is the single source of truth for the
0/-10/-20/-30 schedule. Grading applies it after the model returns,
re-deriving the letter grade if the penalty pulls the numeric score across a
threshold. This means we can change the policy without retraining a prompt.

---

## Mastery gate

The mastery gate is enforced in three places:

- `start-kinesis`: refuses to start a KINESIS milestone unless the preceding
  phase is `completed` and gaps are clear.
- `complete-kinesis`: refuses to complete unless all milestone assignments
  are graded and every checklist item is checked. On success, it auto-marks
  the next phase `active`.
- `project-out`: only runs when a phase is `completed`/`project_out` and at
  least one open gap exists. Sets phase status to `project_out`. Pass
  threshold (A 93%+) is enforced by the rubric in `lib/rubrics/index.ts`,
  applied by the model. We don't auto-detect "the capstone passed" yet —
  the user manually transitions on dashboard or admin once the grade lands.

---

## Idempotent generation

Both `generate-reading` and `generate-week` overwrite the existing markdown
in `weeks` rather than appending. `generate-week` checks existing assignment
kinds before inserting new rows. Re-running is safe — at worst, it costs
another Claude call.

---

## Submissions are append-only

Each submission gets a fresh `submissions` row with an incrementing
`attempt_number` and a fresh `grades` row. Nothing is ever deleted; rebuttals
attach a new `grades` row keyed back to the original. The "current grade" is
the most recent grade for a submission.

---

## Notifications

Two channels:

1. **In-app**: `NotificationsPoller` hits `/api/notifications` every 60s and
   surfaces unread items as a toast. No realtime channel is needed.
2. **Email**: `/api/cron/email-notifications` runs every 15m, finds rows with
   `emailed_at IS NULL`, sends via Resend, and stamps `emailed_at`. The email
   queue is the same `notifications` table.

The grading flow inserts a notification row directly. `due-soon` cron creates
notifications for upcoming due dates with de-dupe on `kind + link_url`.

---

## Why no GitHub Issues integration

The spec is explicit: deadlines belong in this LMS, not GitHub. The repo at
the parent level (`embedded-systems-roadmap/`) is the *portfolio*, not the
schedule. Mixing them would dilute the commit history and put non-deliverable
clutter in front of recruiters.

---

## File / module map

```
lms/
├── app/
│   ├── (authed)/                   # protected routes share this layout
│   │   ├── dashboard/
│   │   ├── phase/[id]/
│   │   ├── week/[id]/
│   │   ├── assignment/[id]/
│   │   │   └── rebuttal/
│   │   ├── exam/[id]/
│   │   ├── exam-prep/[id]/
│   │   ├── grades/
│   │   ├── gaps/
│   │   ├── kinesis/[id]/
│   │   ├── project-out/
│   │   └── admin/
│   ├── api/
│   │   ├── generate-reading/
│   │   ├── generate-week/
│   │   ├── generate-syllabus/
│   │   ├── submit-assignment/
│   │   ├── grade-submission/
│   │   ├── rebut-grade/
│   │   ├── start-exam-prep/
│   │   ├── submit-exam/
│   │   ├── start-kinesis/
│   │   ├── complete-kinesis/
│   │   ├── project-out/
│   │   ├── generate-remediation/
│   │   ├── pushback/
│   │   ├── dashboard-data/
│   │   ├── notifications/
│   │   ├── bump-gaps/
│   │   └── cron/
│   │       ├── email-notifications/
│   │       └── due-soon/
│   ├── login/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # → redirect to /dashboard
├── components/
│   ├── ui/                         # primitives (Button, Card, Badge)
│   ├── AppShell.tsx
│   ├── AssignmentBadge.tsx
│   ├── GenerateButtons.tsx
│   ├── GradeCard.tsx
│   ├── Markdown.tsx
│   ├── NotificationsPoller.tsx
│   ├── SubmissionForm.tsx
│   └── WeekTabs.tsx
├── lib/
│   ├── prompts/
│   │   ├── generate.ts             # all generation prompts
│   │   ├── grade.ts                # all grading prompts
│   │   └── system.ts               # shared system prompt
│   ├── rubrics/index.ts            # default rubric per assignment kind
│   ├── supabase/
│   │   ├── browser.ts              # client-side singleton
│   │   ├── server.ts               # server component client
│   │   ├── admin.ts                # service role client (API only)
│   │   └── types.ts                # Database<...> contract
│   ├── anthropic.ts                # callClaude, extractJson
│   ├── api.ts                      # authedHandler wrapper
│   ├── auth.ts                     # requireUser
│   ├── email.ts                    # Resend wrapper
│   ├── grading.ts                  # gradeSubmission, evaluateRebuttal
│   ├── queries.ts                  # typed Supabase reads
│   ├── sanitize.ts                 # input bounds + injection scrubs
│   └── utils.ts                    # cn, formatDate, late penalty, letter grade
├── supabase/
│   ├── schema.sql                  # full schema + RLS
│   └── seed.sql                    # phases + KINESIS + Phase 1 weeks
├── scripts/seed.ts                 # substitute :user_id and print SQL
├── middleware.ts                   # session check + redirect
├── vercel.json                     # cron schedules
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

---

## Things that are intentionally simple

- No state-management library. Server components + `router.refresh()` after
  mutations is enough for a single-user app.
- No form library. Native `<form>` + `useState` is enough.
- No test runner wired up yet. The interesting failure modes (Claude returning
  malformed JSON, Postgres rejecting an insert) are exercised in normal use,
  and a faulty branch is one click away from rollback. If this scales to
  multiple users, add Vitest + Playwright.
- No analytics, telemetry, or error tracking. `usage_log` covers the only
  signal that matters: cost.
