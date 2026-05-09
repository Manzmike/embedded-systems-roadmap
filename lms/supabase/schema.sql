-- Roadmap LMS — Schema
-- Apply by pasting into Supabase SQL editor (or psql -f).
-- Idempotent: safe to re-run.
--
-- Order:
--   1. enums / extensions
--   2. tables
--   3. indexes
--   4. RLS enable
--   5. RLS policies
--   6. helper RPCs

-- =========================================================================
-- 1. extensions
-- =========================================================================
create extension if not exists pgcrypto;

-- =========================================================================
-- 2. tables
-- =========================================================================

-- phases ------------------------------------------------------------------
create table if not exists phases (
  id            int primary key,
  name          text not null,
  description   text,
  planned_start date not null,
  planned_end   date not null,
  actual_start  date,
  actual_end    date,
  status        text not null default 'pending'
                check (status in ('pending', 'active', 'completed', 'project_out')),
  syllabus_md   text,
  final_grade   text,
  user_id       uuid references auth.users(id) on delete cascade not null
);

-- weeks -------------------------------------------------------------------
create table if not exists weeks (
  id            serial primary key,
  phase_id      int references phases(id) on delete cascade not null,
  week_number   int not null,
  topic         text not null,
  planned_date  date not null,
  actual_date   date,
  status        text not null default 'pending'
                check (status in ('pending', 'active', 'completed', 'pushed', 'exam_prep')),
  reading_md    text,
  tutorial_md   text,
  problem_md    text,
  notebooklm_md text,
  generated_at  timestamptz,
  user_id       uuid references auth.users(id) on delete cascade not null,
  unique (phase_id, week_number)
);

-- assignments -------------------------------------------------------------
create table if not exists assignments (
  id                serial primary key,
  week_id           int references weeks(id) on delete cascade,
  phase_id          int references phases(id) on delete cascade not null,
  kind              text not null check (kind in (
                      'weekly_report',
                      'discussion_post',
                      'tutorial_completion',
                      'mini_problem',
                      'main_project',
                      'mid_phase_exam',
                      'end_phase_exam',
                      'kinesis_report',
                      'kinesis_project',
                      'project_out',
                      'remediation'
                    )),
  title             text not null,
  prompt_md         text,
  rubric_md         text,
  due_at            timestamptz not null,
  late_window_hours int not null default 72,
  max_submissions   int not null default 1,
  status            text not null default 'open'
                    check (status in (
                      'open', 'submitted', 'graded', 'late', 'missed',
                      'rebuttal_pending', 'rebuttal_resolved', 'pending_grade'
                    )),
  kinesis_milestone_id int,
  created_at        timestamptz default now(),
  user_id           uuid references auth.users(id) on delete cascade not null
);

-- submissions -------------------------------------------------------------
create table if not exists submissions (
  id              serial primary key,
  assignment_id   int references assignments(id) on delete cascade not null,
  attempt_number  int not null default 1,
  submitted_at    timestamptz not null default now(),
  is_late         boolean not null default false,
  hours_late      int default 0,
  content_md      text,
  code            text,
  language        text,
  filename        text,
  github_url      text,
  user_id         uuid references auth.users(id) on delete cascade not null,
  unique (assignment_id, attempt_number)
);

-- grades ------------------------------------------------------------------
create table if not exists grades (
  id                   serial primary key,
  submission_id        int references submissions(id) on delete cascade not null,
  letter_grade         text not null,
  numeric_grade        int not null check (numeric_grade between 0 and 100),
  late_penalty_applied int default 0,
  rubric_breakdown     jsonb,
  feedback_md          text not null,
  strengths_md         text,
  improvements_md      text,
  graded_at            timestamptz not null default now(),
  graded_by            text not null default 'claude_api',
  raw_response         jsonb,
  user_id              uuid references auth.users(id) on delete cascade not null
);

-- rebuttals ---------------------------------------------------------------
create table if not exists rebuttals (
  id                 serial primary key,
  grade_id           int references grades(id) on delete cascade not null,
  user_argument_md   text not null,
  submitted_at       timestamptz not null default now(),
  ai_response_md     text,
  outcome            text check (outcome in ('upheld', 'partially_revised', 'fully_revised')),
  revised_grade_id   int references grades(id) on delete set null,
  resolved_at        timestamptz,
  user_id            uuid references auth.users(id) on delete cascade not null
);

-- gaps --------------------------------------------------------------------
create table if not exists gaps (
  id                              serial primary key,
  phase_id                        int references phases(id) on delete cascade not null,
  week_id                         int references weeks(id) on delete set null,
  topic                           text not null,
  description                     text not null,
  category                        text,
  identified_at                   timestamptz not null default now(),
  identified_from_assignment_id   int references assignments(id) on delete set null,
  resolved                        boolean default false,
  resolved_at                     timestamptz,
  resolved_by_assignment_id       int references assignments(id) on delete set null,
  weeks_persisting                int default 1,
  user_id                         uuid references auth.users(id) on delete cascade not null
);

-- kinesis_milestones ------------------------------------------------------
create table if not exists kinesis_milestones (
  id                       int primary key,
  name                     text not null,
  description_md           text not null,
  preceding_phase_id       int references phases(id) on delete cascade not null,
  duration_weeks           int not null,
  planned_start            date,
  actual_start             date,
  actual_end               date,
  status                   text not null default 'locked'
                           check (status in ('locked', 'available', 'in_progress', 'completed')),
  completion_criteria_md   text not null,
  hardware_confirmed       boolean default false,
  completion_checklist     jsonb default '{}'::jsonb,
  user_id                  uuid references auth.users(id) on delete cascade not null
);

-- exam_prep_windows -------------------------------------------------------
create table if not exists exam_prep_windows (
  id                 serial primary key,
  exam_assignment_id int references assignments(id) on delete cascade not null,
  start_date         date not null,
  end_date           date not null,
  duration_days      int not null,
  study_guide_md     text,
  user_id            uuid references auth.users(id) on delete cascade not null
);

-- pushbacks ---------------------------------------------------------------
create table if not exists pushbacks (
  id                 serial primary key,
  pushed_at          timestamptz not null default now(),
  reason             text not null,
  weeks_pushed       int not null default 1,
  affected_phase_id  int references phases(id) on delete set null,
  affected_week_id   int references weeks(id) on delete set null,
  user_id            uuid references auth.users(id) on delete cascade not null
);

-- usage_log ---------------------------------------------------------------
create table if not exists usage_log (
  id                serial primary key,
  called_at         timestamptz not null default now(),
  endpoint          text not null,
  model             text not null,
  input_tokens      int,
  output_tokens     int,
  cost_usd_estimate numeric(10, 4),
  user_id           uuid references auth.users(id) on delete cascade not null
);

-- notifications -----------------------------------------------------------
create table if not exists notifications (
  id          serial primary key,
  kind        text not null,
  title       text not null,
  body_md     text,
  link_url    text,
  read_at     timestamptz,
  emailed_at  timestamptz,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete cascade not null
);

-- =========================================================================
-- 3. indexes
-- =========================================================================
create index if not exists idx_weeks_phase           on weeks(phase_id, week_number);
create index if not exists idx_assignments_week      on assignments(week_id);
create index if not exists idx_assignments_due       on assignments(user_id, due_at);
create index if not exists idx_assignments_status    on assignments(user_id, status);
create index if not exists idx_submissions_assign    on submissions(assignment_id, attempt_number);
create index if not exists idx_grades_submission     on grades(submission_id);
create index if not exists idx_gaps_unresolved       on gaps(user_id, resolved);
create index if not exists idx_notifications_unread  on notifications(user_id, read_at);

-- =========================================================================
-- 4. enable RLS
-- =========================================================================
alter table phases              enable row level security;
alter table weeks               enable row level security;
alter table assignments         enable row level security;
alter table submissions         enable row level security;
alter table grades              enable row level security;
alter table rebuttals           enable row level security;
alter table gaps                enable row level security;
alter table kinesis_milestones  enable row level security;
alter table exam_prep_windows   enable row level security;
alter table pushbacks           enable row level security;
alter table usage_log           enable row level security;
alter table notifications       enable row level security;

-- =========================================================================
-- 5. RLS policies — owner-only access on every table
-- =========================================================================
do $$
declare
  t text;
  tables text[] := array[
    'phases','weeks','assignments','submissions','grades','rebuttals',
    'gaps','kinesis_milestones','exam_prep_windows','pushbacks',
    'usage_log','notifications'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s_owner_select" on %I', t, t);
    execute format('drop policy if exists "%s_owner_insert" on %I', t, t);
    execute format('drop policy if exists "%s_owner_update" on %I', t, t);
    execute format('drop policy if exists "%s_owner_delete" on %I', t, t);

    execute format($f$
      create policy "%s_owner_select" on %I
        for select using (user_id = auth.uid())
    $f$, t, t);

    execute format($f$
      create policy "%s_owner_insert" on %I
        for insert with check (user_id = auth.uid())
    $f$, t, t);

    execute format($f$
      create policy "%s_owner_update" on %I
        for update using (user_id = auth.uid()) with check (user_id = auth.uid())
    $f$, t, t);

    execute format($f$
      create policy "%s_owner_delete" on %I
        for delete using (user_id = auth.uid())
    $f$, t, t);
  end loop;
end $$;

-- =========================================================================
-- 6. helper RPCs
-- =========================================================================

-- current_gpa(phase_id) — mean numeric_grade across most recent grade per
-- submission for graded assignments in the phase.
create or replace function current_gpa(p_phase_id int)
returns numeric
language sql
stable
security invoker
as $$
  select round(avg(g.numeric_grade)::numeric, 1)
  from assignments a
  join submissions s on s.assignment_id = a.id
  join grades g      on g.submission_id = s.id
  where a.phase_id = p_phase_id
    and a.user_id  = auth.uid()
    and a.status   in ('graded','rebuttal_resolved');
$$;

-- phase_progress(phase_id) — pct of weeks completed
create or replace function phase_progress(p_phase_id int)
returns numeric
language sql
stable
security invoker
as $$
  select case when count(*) = 0 then 0
              else round(100.0 * sum(case when status = 'completed' then 1 else 0 end) / count(*), 1)
         end
  from weeks
  where phase_id = p_phase_id and user_id = auth.uid();
$$;

-- bump_persisting_gaps() — increments weeks_persisting for unresolved gaps;
-- intended to be called once a week by a scheduled task.
create or replace function bump_persisting_gaps()
returns void
language sql
security invoker
as $$
  update gaps
  set weeks_persisting = coalesce(weeks_persisting, 1) + 1
  where resolved = false and user_id = auth.uid();
$$;
