import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getAllPhases, getActiveWeek } from "@/lib/queries";

import { AdminTools } from "./AdminTools";

export default async function AdminPage() {
  const { supabase } = await requireUser();
  const phases = await getAllPhases(supabase);
  const active = phases.find((p) => p.status === "active");
  const activeWeek = active ? await getActiveWeek(supabase, active.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Trigger generation, edit phase metadata, manually create
          assignments. Use this sparingly; the LMS prefers the scheduled flow.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Phases</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-[color:var(--color-border)]">
          {phases.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/phase/${p.id}`} className="font-medium no-underline">
                  {p.name}
                </Link>
                <p className="text-xs text-[color:var(--color-text-dim)]">
                  {p.status}
                </p>
              </div>
              <Link
                href={`/phase/${p.id}/syllabus`}
                className="text-sm"
              >
                Syllabus →
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <AdminTools
        activePhaseId={active?.id ?? null}
        activeWeekId={activeWeek?.id ?? null}
      />
    </div>
  );
}
