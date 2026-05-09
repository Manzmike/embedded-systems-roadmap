import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

import { ResolveGapButton } from "./ResolveGapButton";

export default async function GapsPage() {
  const { supabase } = await requireUser();
  const { data: gaps } = await supabase
    .from("gaps")
    .select("*")
    .order("resolved", { ascending: true })
    .order("weeks_persisting", { ascending: false });

  const open = (gaps ?? []).filter((g) => !g.resolved);
  const resolved = (gaps ?? []).filter((g) => g.resolved);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Gap tracker</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Gaps are auto-created when grading identifies a weak topic. They block
          the mastery gate.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Open ({open.length})</CardTitle>
        </CardHeader>
        {open.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">No open gaps.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {open.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{g.topic}</p>
                  <p className="text-sm text-[color:var(--color-text-dim)]">
                    {g.description}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
                    {g.category ? `${g.category} · ` : ""}identified{" "}
                    {formatDate(g.identified_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-xs">
                    {g.weeks_persisting ?? 1}w
                  </span>
                  <ResolveGapButton gapId={g.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <details>
        <summary className="cursor-pointer text-sm text-[color:var(--color-text-dim)]">
          Resolved ({resolved.length})
        </summary>
        <Card className="mt-3">
          {resolved.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-dim)]">None.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {resolved.map((g) => (
                <li key={g.id} className="py-3">
                  <p className="font-medium line-through opacity-70">{g.topic}</p>
                  <p className="text-xs text-[color:var(--color-text-dim)]">
                    Resolved {formatDate(g.resolved_at ?? "")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </details>
    </div>
  );
}
