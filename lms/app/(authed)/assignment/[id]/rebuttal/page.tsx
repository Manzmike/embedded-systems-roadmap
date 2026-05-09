import { notFound } from "next/navigation";

import { GradeCard } from "@/components/GradeCard";
import { Markdown } from "@/components/Markdown";
import { RebuttalForm } from "./RebuttalForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getAssignment, getSubmissionsForAssignment } from "@/lib/queries";

export default async function RebuttalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignmentId = Number(id);
  const { supabase } = await requireUser();
  const assignment = await getAssignment(supabase, assignmentId);
  if (!assignment) notFound();

  const submissions = await getSubmissionsForAssignment(supabase, assignmentId);
  const submission = submissions[0];
  const grade = submission?.grades?.[0];
  if (!submission || !grade) notFound();

  // Existing rebuttal for this grade?
  const { data: priorRebuttals } = await supabase
    .from("rebuttals")
    .select("*")
    .eq("grade_id", grade.id)
    .order("submitted_at", { ascending: false });

  const latestRebuttal = priorRebuttals?.[0] ?? null;
  const resolved = latestRebuttal?.outcome != null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Rebuttal — {assignment.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          You may argue that the original grade misjudged a specific criterion.
          The grader will re-evaluate against the rubric. Both grades are kept.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Original submission</CardTitle>
        </CardHeader>
        {submission.content_md ? (
          <Markdown source={submission.content_md} />
        ) : null}
        {submission.code ? (
          <pre className="mt-3 overflow-x-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs">
            <code>{submission.code}</code>
          </pre>
        ) : null}
      </Card>

      <GradeCard grade={grade} assignmentId={assignmentId} showRebuttal={false} />

      {latestRebuttal ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Rebuttal {resolved ? `· ${latestRebuttal.outcome}` : "submitted"}
            </CardTitle>
          </CardHeader>
          <h3 className="text-sm font-medium text-[color:var(--color-text-dim)]">
            Your argument
          </h3>
          <Markdown source={latestRebuttal.user_argument_md} />
          {latestRebuttal.ai_response_md ? (
            <>
              <h3 className="mt-4 text-sm font-medium text-[color:var(--color-text-dim)]">
                Grader response
              </h3>
              <Markdown source={latestRebuttal.ai_response_md} />
            </>
          ) : null}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit rebuttal</CardTitle>
          </CardHeader>
          <RebuttalForm gradeId={grade.id} />
        </Card>
      )}
    </div>
  );
}
