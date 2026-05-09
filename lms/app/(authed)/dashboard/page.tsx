import Link from "next/link";

import { AssignmentStatusBadge, DueBadge } from "@/components/AssignmentBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import {
  currentGpa,
  getActivePhase,
  getActiveWeek,
  getDueThisWeek,
  getOpenGaps,
  getRecentGrades,
  phaseProgressPct,
} from "@/lib/queries";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const phase = await getActivePhase(supabase);
  if (!phase) {
    return (
      <div>
        <h1 className="text-xl font-semibold">No active phase</h1>
        <p className="mt-2 text-[color:var(--color-text-dim)]">
          Use the admin page to mark a phase active.
        </p>
      </div>
    );
  }

  const [week, gpa, progress, due, recent, gaps] = await Promise.all([
    getActiveWeek(supabase, phase.id),
    currentGpa(supabase, phase.id),
    phaseProgressPct(supabase, phase.id),
    getDueThisWeek(supabase),
    getRecentGrades(supabase, 5),
    getOpenGaps(supabase, 3),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
            Current phase
          </p>
          <p className="mt-1 text-lg font-semibold">{phase.name}</p>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            {formatDate(phase.planned_start)} → {formatDate(phase.planned_end)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
            <div
              className="h-full bg-[color:var(--color-accent)]"
              style={{ width: `${Math.max(0, Math.min(progress ?? 0, 100))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
            {progress ?? 0}% complete
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
            Current week
          </p>
          {week ? (
            <Link href={`/week/${week.id}`} className="mt-1 block text-lg font-semibold no-underline">
              Week {week.week_number}: {week.topic}
            </Link>
          ) : (
            <p className="mt-1 text-lg font-semibold">No active week</p>
          )}
          <p className="text-sm text-[color:var(--color-text-dim)]">
            {week ? formatDate(week.planned_date) : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
            GPA (this phase)
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {gpa ?? "—"}
          </p>
          <Link href="/grades" className="text-sm">
            View gradebook →
          </Link>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Due this week</CardTitle>
        </CardHeader>
        {due.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Nothing due in the next 7 days.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {due.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link href={`/assignment/${a.id}`} className="font-medium no-underline">
                    {a.title}
                  </Link>
                  <p className="text-xs text-[color:var(--color-text-dim)]">
                    {a.kind.replace("_", " ")} · due {formatDateTime(a.due_at)}
                  </p>
                </div>
                <DueBadge dueAt={a.due_at} status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent grades</CardTitle>
        </CardHeader>
        {recent.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Nothing graded yet.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {recent.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/assignment/${g.submission.assignment.id}`}
                    className="font-medium no-underline"
                  >
                    {g.submission.assignment.title}
                  </Link>
                  <p className="text-xs text-[color:var(--color-text-dim)]">
                    {formatDateTime(g.graded_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums">{g.letter_grade}</p>
                  <p className="text-xs text-[color:var(--color-text-dim)]">
                    {g.numeric_grade}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open gaps</CardTitle>
          <Link href="/gaps" className="text-sm">
            All gaps →
          </Link>
        </CardHeader>
        {gaps.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            No unresolved gaps. Keep it that way.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {gaps.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{g.topic}</p>
                  <p className="text-sm text-[color:var(--color-text-dim)]">
                    {g.description}
                  </p>
                </div>
                <span className="rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-xs">
                  {g.weeks_persisting ?? 1}w
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="text-sm text-[color:var(--color-text-dim)]">
        <p>
          Status: phase <span className="font-medium text-[color:var(--color-text)]">{phase.status}</span>{" "}
          · week <span className="font-medium text-[color:var(--color-text)]">{week?.status ?? "—"}</span>
          {due[0] ? <> · next due <AssignmentStatusBadge status={due[0].status} /></> : null}
        </p>
      </section>
    </div>
  );
}
