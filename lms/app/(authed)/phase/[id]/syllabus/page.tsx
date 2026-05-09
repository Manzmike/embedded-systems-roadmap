import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getPhase } from "@/lib/queries";

export default async function SyllabusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const phase = await getPhase(supabase, Number(id));
  if (!phase) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">Syllabus</p>
        <h1 className="mt-1 text-2xl font-semibold">{phase.name}</h1>
      </header>

      <Card>
        {phase.syllabus_md ? (
          <Markdown source={phase.syllabus_md} />
        ) : (
          <div className="text-sm text-[color:var(--color-text-dim)]">
            <p className="mb-3">
              Syllabus has not been generated yet. Use the admin page to generate it.
            </p>
          </div>
        )}
      </Card>

      <p className="text-sm text-[color:var(--color-text-dim)]">
        Office hours: free-form questions go in{" "}
        <a href="https://claude.ai/" target="_blank" rel="noreferrer">
          Claude.ai chat
        </a>
        . The LMS is the structured graded path; Claude.ai is your tutor.
      </p>
    </div>
  );
}
