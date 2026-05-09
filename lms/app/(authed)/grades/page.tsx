import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

const LETTER_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

export default async function GradesPage() {
  const { supabase } = await requireUser();

  const { data: grades } = await supabase
    .from("grades")
    .select(
      "*, submission:submissions(*, assignment:assignments(*, phase:phases(*)))",
    )
    .order("graded_at", { ascending: false });

  const rows = grades ?? [];
  const dist: Record<string, number> = {};
  let sum = 0;
  for (const r of rows) {
    dist[r.letter_grade] = (dist[r.letter_grade] ?? 0) + 1;
    sum += r.numeric_grade;
  }
  const overallGpa = rows.length ? Math.round((sum / rows.length) * 10) / 10 : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Gradebook</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          {rows.length} graded assignments · GPA {overallGpa ?? "—"}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Grade distribution</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {LETTER_ORDER.map((l) => (
            <div
              key={l}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-center"
            >
              <p className="text-xs text-[color:var(--color-text-dim)]">{l}</p>
              <p className="text-lg font-semibold tabular-nums">
                {dist[l] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All grades</CardTitle>
        </CardHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Nothing graded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
                <tr>
                  <th className="py-2">Assignment</th>
                  <th className="py-2">Kind</th>
                  <th className="py-2">Phase</th>
                  <th className="py-2">Graded</th>
                  <th className="py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {rows.map((g: typeof rows[number]) => {
                  const a = (g as never as {
                    submission: {
                      assignment: {
                        id: number;
                        title: string;
                        kind: string;
                        phase: { name: string };
                      };
                    };
                  }).submission.assignment;
                  return (
                    <tr key={g.id}>
                      <td className="py-2">
                        <Link href={`/assignment/${a.id}`} className="no-underline">
                          {a.title}
                        </Link>
                      </td>
                      <td className="py-2 text-[color:var(--color-text-dim)]">
                        {a.kind.replace(/_/g, " ")}
                      </td>
                      <td className="py-2 text-[color:var(--color-text-dim)]">
                        {a.phase?.name}
                      </td>
                      <td className="py-2 text-[color:var(--color-text-dim)]">
                        {formatDateTime(g.graded_at)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {g.letter_grade} ({g.numeric_grade})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
