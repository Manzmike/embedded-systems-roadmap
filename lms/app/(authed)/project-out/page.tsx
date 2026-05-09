import Link from "next/link";

import { Markdown } from "@/components/Markdown";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getAllPhases } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

import { GenerateProjectOutButton } from "./GenerateButton";

export default async function ProjectOutPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const { phase: phaseParam } = await searchParams;
  const { supabase } = await requireUser();
  const phases = await getAllPhases(supabase);

  // pick the phase under project-out, defaulting to ?phase= or the first
  // completed-with-gaps phase.
  const target = phaseParam ? phases.find((p) => p.id === Number(phaseParam)) : null;

  const candidates = phases.filter(
    (p) => p.status === "completed" || p.status === "project_out",
  );

  // open gaps per phase
  const { data: openGaps } = await supabase
    .from("gaps")
    .select("*")
    .eq("resolved", false);
  const openByPhase = new Map<number, typeof openGaps>();
  for (const g of openGaps ?? []) {
    const arr = openByPhase.get(g.phase_id) ?? [];
    arr.push(g);
    openByPhase.set(g.phase_id, arr);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Project Out</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Mastery-gate capstone for any completed phase that still has unresolved
          gaps. Pass threshold A (93%+).
        </p>
      </header>

      {candidates.length === 0 ? (
        <Card>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            No completed phases with project-out eligibility yet.
          </p>
        </Card>
      ) : null}

      {candidates.map((p) => {
        const gaps = openByPhase.get(p.id) ?? [];
        return (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <span className="text-xs text-[color:var(--color-text-dim)]">
                Status: {p.status}
              </span>
            </CardHeader>
            <p className="text-sm text-[color:var(--color-text-dim)]">
              Completed{" "}
              {p.actual_end ? formatDate(p.actual_end) : "(date pending)"} ·{" "}
              {gaps.length} unresolved gaps
            </p>
            {gaps.length > 0 ? (
              <ul className="mt-3 list-disc pl-5 text-sm">
                {gaps.map((g) => (
                  <li key={g.id}>
                    <span className="font-medium">{g.topic}</span> — {g.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--color-text-dim)]">
                No open gaps. Project-out is not required for this phase.
              </p>
            )}
            {gaps.length > 0 ? (
              <div className="mt-4">
                <GenerateProjectOutButton phaseId={p.id} />
              </div>
            ) : null}
          </Card>
        );
      })}

      {target ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected: {target.name}</CardTitle>
            <Link href={`/phase/${target.id}`} className="text-sm">
              Phase detail →
            </Link>
          </CardHeader>
          <Markdown source={target.description} />
        </Card>
      ) : null}
    </div>
  );
}
