import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getAssignment } from "@/lib/queries";
import { formatDate, hoursUntil } from "@/lib/utils";

export default async function ExamPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: window } = await supabase
    .from("exam_prep_windows")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  if (!window) notFound();
  const exam = await getAssignment(supabase, window.exam_assignment_id);
  if (!exam) notFound();

  const hRemaining = hoursUntil(exam.due_at);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          Exam prep window
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{exam.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          {formatDate(window.start_date)} → {formatDate(window.end_date)} ·{" "}
          {window.duration_days} days · {hRemaining}h until exam
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-warn)]">
          New READING/PROBLEM/discussion-post generation is paused during the
          prep window. Only this study guide and the exam itself are active.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Study guide</CardTitle>
        </CardHeader>
        <Markdown source={window.study_guide_md} />
      </Card>
    </div>
  );
}
