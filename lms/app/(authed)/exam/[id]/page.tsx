import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getAssignment, getSubmissionsForAssignment } from "@/lib/queries";
import { GradeCard } from "@/components/GradeCard";
import { formatDateTime, hoursUntil } from "@/lib/utils";

import { ExamRunner } from "./ExamRunner";

interface ExamSpec {
  duration_minutes: number;
  questions: { id: string; type: string; prompt_md: string; max_points: number; rubric_md: string }[];
  total_points: number;
}

function parseExamSpec(prompt: string | null): ExamSpec | null {
  if (!prompt) return null;
  const fence = prompt.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (!fence) return null;
  try {
    return JSON.parse(fence[1]);
  } catch {
    return null;
  }
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const assignment = await getAssignment(supabase, Number(id));
  if (!assignment) notFound();
  if (
    assignment.kind !== "mid_phase_exam" &&
    assignment.kind !== "end_phase_exam"
  ) {
    notFound();
  }

  const spec = parseExamSpec(assignment.prompt_md);
  const submissions = await getSubmissionsForAssignment(supabase, assignment.id);
  const lastSubmission = submissions[0] ?? null;
  const lastGrade = lastSubmission?.grades?.[0] ?? null;

  const hUntil = hoursUntil(assignment.due_at);
  const locked = hUntil > 168; // exam locked until <1 week before due (placeholder rule)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          {assignment.kind.replace(/_/g, " ")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{assignment.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          Due {formatDateTime(assignment.due_at)}
          {spec ? ` · ${spec.duration_minutes} min · ${spec.total_points} pts` : ""}
        </p>
      </header>

      {lastGrade ? (
        <GradeCard grade={lastGrade} assignmentId={assignment.id} showRebuttal={true} />
      ) : null}

      {locked ? (
        <Card>
          <CardHeader>
            <CardTitle>Locked</CardTitle>
          </CardHeader>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Exam opens during the prep window leading up to the due date.
          </p>
        </Card>
      ) : !spec ? (
        <Card>
          <CardHeader>
            <CardTitle>Exam not generated</CardTitle>
          </CardHeader>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Generate the exam from the admin page.
          </p>
        </Card>
      ) : lastSubmission ? (
        <Card>
          <CardHeader>
            <CardTitle>Submitted</CardTitle>
          </CardHeader>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Submitted {formatDateTime(lastSubmission.submitted_at)} —
            {lastGrade ? " grade above." : " awaiting grade."}
          </p>
        </Card>
      ) : (
        <ExamRunner
          assignmentId={assignment.id}
          questions={spec.questions}
        />
      )}

      {assignment.rubric_md ? (
        <Card>
          <CardHeader>
            <CardTitle>Rubric</CardTitle>
          </CardHeader>
          <Markdown source={assignment.rubric_md} />
        </Card>
      ) : null}
    </div>
  );
}
