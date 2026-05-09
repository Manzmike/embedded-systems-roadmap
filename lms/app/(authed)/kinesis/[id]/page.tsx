import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";

import { KinesisActions } from "./KinesisActions";

export default async function KinesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: m } = await supabase
    .from("kinesis_milestones")
    .select("*, phase:phases!preceding_phase_id(*)")
    .eq("id", Number(id))
    .maybeSingle();
  if (!m) notFound();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("kinesis_milestone_id", m.id)
    .order("kind");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          KINESIS milestone {m.id}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{m.name}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Status: <span className="font-medium text-[color:var(--color-text)]">{m.status}</span> ·{" "}
          {m.duration_weeks} weeks
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <Markdown source={m.description_md} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion criteria</CardTitle>
        </CardHeader>
        <Markdown source={m.completion_criteria_md} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked assignments</CardTitle>
        </CardHeader>
        {(assignments ?? []).length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            No assignments yet — start the milestone to generate them.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {(assignments ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <Link href={`/assignment/${a.id}`} className="font-medium no-underline">
                  {a.title}
                </Link>
                <span className="text-xs text-[color:var(--color-text-dim)]">
                  {a.kind.replace(/_/g, " ")} · {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <KinesisActions
        milestoneId={m.id}
        status={m.status}
        hardwareConfirmed={m.hardware_confirmed ?? false}
        completionChecklistMd={m.completion_criteria_md}
      />
    </div>
  );
}
