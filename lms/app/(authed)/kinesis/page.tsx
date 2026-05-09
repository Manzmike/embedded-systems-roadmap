import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";

const STATUS_TONE = {
  locked: "neutral",
  available: "info",
  in_progress: "warn",
  completed: "ok",
} as const;

export default async function KinesisIndexPage() {
  const { supabase } = await requireUser();
  const { data: ms } = await supabase
    .from("kinesis_milestones")
    .select("*")
    .order("id");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">KINESIS</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Application milestones gating each phase transition. K-1 unlocks after
          Phase 1 mastery gate clears, and so on.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {(ms ?? []).map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle>{m.name}</CardTitle>
              <Badge tone={STATUS_TONE[m.status]}>{m.status.replace("_", " ")}</Badge>
            </CardHeader>
            <p className="text-sm text-[color:var(--color-text-dim)]">
              Preceding phase {m.preceding_phase_id} · {m.duration_weeks} weeks
            </p>
            <div className="mt-3">
              <Link href={`/kinesis/${m.id}`} className="text-sm">
                Detail →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
