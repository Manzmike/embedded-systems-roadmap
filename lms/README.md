# Roadmap LMS

A personal Learning Management System for a 3–5 year embedded systems
engineering self-study program. Single user. Claude (via the Anthropic API) is
the professor and grader. Supabase is the database. Vercel hosts it.

This directory is the Next.js app. The repo root has the curriculum
scaffolding (per-week folders, weekly reports) — those are kept out of this
LMS and managed via git as the public portfolio of work.

---

## Stack

- Next.js 16 (App Router, TypeScript)
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude API (model `claude-opus-4-7`)
- Tailwind CSS v4
- Resend for transactional email (optional)
- Vercel (hosting + cron)

---

## Local setup

```bash
cd lms
npm install
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   ANTHROPIC_API_KEY
#   RESEND_API_KEY      (optional, for email)
#   RESEND_FROM_EMAIL   (optional)
#   USER_EMAIL          (optional, recipient)
#   NEXT_PUBLIC_USER_TZ (e.g. America/Los_Angeles)
npm run dev
```

Visit `http://localhost:3000`. You will be redirected to `/login`.

---

## Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run `supabase/schema.sql`. This creates all tables,
   indexes, RLS policies, and helper RPCs. It is idempotent — safe to re-run.
3. Create the single user account via the Supabase Auth dashboard
   (Authentication → Users → Add user). Use email + password. Confirm the
   email immediately.
4. Copy the user's UUID. Run the seed:
   ```bash
   USER_ID=<uuid> npm run seed > seed.substituted.sql
   ```
   Paste `seed.substituted.sql` into the SQL editor and run.
5. Verify: log in at `/login`. Dashboard should show Phase 1, Week 1.

---

## Anthropic setup

1. Generate an API key at https://console.anthropic.com.
2. Set `ANTHROPIC_API_KEY` in `.env.local` (and in Vercel env vars for prod).
3. Optional: override `ANTHROPIC_MODEL` if you want to test against a smaller
   model. Default is `claude-opus-4-7`.

---

## Resend (email) setup — optional

The app works without email; in-app notifications cover the same events.
To enable email:

1. Sign up at resend.com. Verify your domain (or use `onboarding@resend.dev`
   for testing).
2. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `USER_EMAIL`.
3. Vercel cron (configured in `vercel.json`) hits
   `/api/cron/email-notifications` every 15 minutes to drain the
   notification queue.

---

## Deployment (Vercel)

1. `vercel link` from this directory.
2. Set all env vars in the Vercel dashboard.
3. `vercel deploy --prod`.
4. Crons in `vercel.json` activate automatically.

---

## Day-to-day usage

The weekly cycle is enforced via assignment due dates rather than scheduled
generation. To run it as designed:

- **Sunday 8 PM:** click "Generate READING" on the active week.
- **Saturday 6:30 AM:** click "Generate TUTORIAL + PROBLEM" on the active week.
  This also creates the six gradable assignment rows for the week with their
  due dates already set (Tue/Fri 8 PM, Sat 1 PM, Sun 6 AM/noon/6 PM).
- Submit each assignment via its detail page.
- After grading, optionally request a rebuttal.

---

## Adding a new phase

Edit `supabase/seed.sql`'s `phases` and `kinesis_milestones` blocks, or insert
directly:

```sql
insert into phases (id, name, description, planned_start, planned_end, status, user_id)
values (5, 'Phase 5: <name>', '<desc>', '2028-07-01', '2029-01-01', 'pending',
        '<user_id>');
```

Weeks for a new phase can be seeded by adapting the `do $$ ... $$` block at
the bottom of `seed.sql`.

---

## Backing up the database

Supabase Free tier supports daily backups. To pull a manual snapshot:

```bash
pg_dump "$(supabase status -o env | grep SUPABASE_DB_URL | cut -d= -f2-)" \
  --data-only --schema=public > backups/$(date +%F).sql
```

For full schema + data: drop `--data-only`. Keep these dumps under
`lms/backups/` (gitignored).

---

## Debugging common issues

- **"Could not parse <<<TUTORIAL>>>/<<<PROBLEM>>>/<<<NOTEBOOKLM>>> blocks"** —
  the model returned a freeform answer. Click Generate again, or open the
  admin page and inspect the raw response in `usage_log`.
- **Submission stuck on `pending_grade`** — grading failed. Hit
  `POST /api/grade-submission` with the `submissionId` to retry.
- **`Past late window — marked missed`** — submitted >72h after due. The
  assignment is now `missed`; a gap was created. Resubmission is blocked.
- **"Hardware must be confirmed"** on KINESIS start — check the box on the
  milestone detail page.
- **Phase doesn't transition after KINESIS** — check that the preceding
  phase has `status = 'completed'`, all gaps are resolved (or project-out
  passed), and all milestone assignments are graded.

---

## Out of scope

- Multi-user support
- Mobile native apps (PWA only)
- Push notifications (email + in-app)
- AI tutoring outside graded assignments (use claude.ai for free-form Q&A)

---

## Cost estimate

| Service       | Plan        | Approx monthly |
| ------------- | ----------- | -------------- |
| Vercel        | Hobby       | $0             |
| Supabase      | Free        | $0             |
| Anthropic API | Pay-as-you-go | $20–50       |
| Resend        | Free        | $0             |
| **Total**     |             | **$20–50**     |

Check `usage_log` rows to track Claude spend per endpoint.
