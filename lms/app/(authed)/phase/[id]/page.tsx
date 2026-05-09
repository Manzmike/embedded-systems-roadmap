import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import {
  currentGpa,
  getPhase,
  getWeeksForPhase,
  phaseProgressPct,
} from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function PhasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const phaseId = Number(id);
  const { supabase } = await requireUser();
  const phase = await getPhase(supabase, phaseId);
  if (!phase) notFound();

  const [weeks, gpa, progress] = await Promise.all([
    getWeeksForPhase(supabase, phaseId),
    currentGpa(supabase, phaseId),
    phaseProgressPct(supabase, phaseId),
  ]);

  const { data: km } = await supabase
    .from("kinesis_milestones")
    .select("*")
    .eq("preceding_phase_id", phaseId)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          Phase {phase.id}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{phase.name}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          {formatDate(phase.planned_start)} → {formatDate(phase.planned_end)}
          {phase.actual_start ? ` · started ${formatDate(phase.actual_start)}` : ""}
          {phase.actual_end ? ` · ended ${formatDate(phase.actual_end)}` : ""}
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/phase/${phase.id}/syllabus`}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm no-underline"
          >
            View syllabus
          </Link>
          {phase.status === "completed" ? (
            <Link
              href={`/project-out?phase=${phase.id}`}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm no-underline"
            >
              Project Out
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">Progress</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{progress ?? 0}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">GPA</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{gpa ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">Status</p>
          <p className="mt-1 text-2xl font-semibold capitalize">{phase.status}</p>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weeks</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-[color:var(--color-border)]">
          {weeks.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/week/${w.id}`} className="font-medium no-underline">
                  Week {w.week_number}: {w.topic}
                </Link>
                <p className="text-xs text-[color:var(--color-text-dim)]">
                  Planned {formatDate(w.planned_date)}
                  {w.actual_date ? ` · actual ${formatDate(w.actual_date)}` : ""}
                </p>
              </div>
              <Badge tone={w.status === "completed" ? "ok" : w.status === "active" ? "info" : "neutral"}>
                {w.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      {km ? (
        <Card>
          <CardHeader>
            <CardTitle>{km.name}</CardTitle>
            <Link href={`/kinesis/${km.id}`} className="text-sm">
              Detail →
            </Link>
          </CardHeader>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Status: <span className="font-medium text-[color:var(--color-text)]">{km.status}</span> · {km.duration_weeks} weeks
          </p>
        </Card>
      ) : null}
    </div>
  );
}
