import Link from "next/link";
import { notFound } from "next/navigation";

import { DueBadge } from "@/components/AssignmentBadge";
import { GenerateButtons } from "@/components/GenerateButtons";
import { WeekTabs } from "@/components/WeekTabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import {
  getAssignmentsForWeek,
  getPhase,
  getWeek,
} from "@/lib/queries";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const week = await getWeek(supabase, Number(id));
  if (!week) notFound();
  const [phase, assignments] = await Promise.all([
    getPhase(supabase, week.phase_id),
    getAssignmentsForWeek(supabase, week.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          {phase?.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Week {week.week_number}: {week.topic}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Planned {formatDate(week.planned_date)} · status {week.status}
          {week.generated_at ? ` · generated ${formatDateTime(week.generated_at)}` : ""}
        </p>
        <div className="mt-4">
          <GenerateButtons weekId={week.id} />
        </div>
      </header>

      <WeekTabs
        reading={week.reading_md}
        tutorial={week.tutorial_md}
        problem={week.problem_md}
        notebooklm={week.notebooklm_md}
      />

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        {assignments.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            No assignments yet — generate the week first.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link href={`/assignment/${a.id}`} className="font-medium no-underline">
                    {a.title}
                  </Link>
                  <p className="text-xs text-[color:var(--color-text-dim)]">
                    {a.kind.replace(/_/g, " ")} · due {formatDateTime(a.due_at)}
                  </p>
                </div>
                <DueBadge dueAt={a.due_at} status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
