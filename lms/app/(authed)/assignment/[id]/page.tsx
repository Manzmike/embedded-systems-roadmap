import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentStatusBadge, DueBadge } from "@/components/AssignmentBadge";
import { GradeCard } from "@/components/GradeCard";
import { Markdown } from "@/components/Markdown";
import { SubmissionForm } from "@/components/SubmissionForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import {
  getAssignment,
  getSubmissionsForAssignment,
} from "@/lib/queries";
import { formatDateTime, hoursLate, hoursUntil } from "@/lib/utils";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const assignment = await getAssignment(supabase, Number(id));
  if (!assignment) notFound();

  // Exams have their own page.
  if (
    assignment.kind === "mid_phase_exam" ||
    assignment.kind === "end_phase_exam"
  ) {
    return (
      <div>
        <h1 className="text-xl font-semibold">{assignment.title}</h1>
        <p className="mt-2">
          <Link href={`/exam/${assignment.id}`} className="underline">
            Open exam interface →
          </Link>
        </p>
      </div>
    );
  }

  const submissions = await getSubmissionsForAssignment(supabase, assignment.id);
  const lastSubmission = submissions[0] ?? null;
  const lastGrade = lastSubmission?.grades?.[0] ?? null;

  const hLeft = hoursUntil(assignment.due_at);
  const hLate = hoursLate(assignment.due_at);
  const inLateWindow = hLeft < 0 && hLate < assignment.late_window_hours;
  const isMissed = hLeft < 0 && hLate >= assignment.late_window_hours;
  const submissionsRemaining = assignment.max_submissions - submissions.length;
  const canSubmit =
    !isMissed &&
    submissionsRemaining > 0 &&
    assignment.status !== "graded" &&
    assignment.status !== "rebuttal_resolved";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-dim)]">
          {assignment.kind.replace(/_/g, " ")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{assignment.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-text-dim)]">
          <span>Due {formatDateTime(assignment.due_at)}</span>
          <DueBadge dueAt={assignment.due_at} status={assignment.status} />
          <AssignmentStatusBadge status={assignment.status} />
          <span>
            Submissions remaining: {Math.max(submissionsRemaining, 0)} /{" "}
            {assignment.max_submissions}
          </span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <Markdown source={assignment.prompt_md} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rubric</CardTitle>
        </CardHeader>
        <Markdown source={assignment.rubric_md} />
      </Card>

      {lastGrade ? (
        <GradeCard
          grade={lastGrade}
          assignmentId={assignment.id}
          showRebuttal={assignment.status === "graded"}
        />
      ) : null}

      {lastSubmission && !lastGrade ? (
        <Card>
          <CardHeader>
            <CardTitle>Submitted — awaiting grade</CardTitle>
          </CardHeader>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            Submitted {formatDateTime(lastSubmission.submitted_at)}
            {lastSubmission.is_late
              ? ` · ${lastSubmission.hours_late ?? 0}h late`
              : ""}
          </p>
        </Card>
      ) : null}

      {canSubmit ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Submit{inLateWindow ? " (late)" : ""}
            </CardTitle>
          </CardHeader>
          {inLateWindow ? (
            <p className="mb-3 text-sm text-[color:var(--color-warn)]">
              Past due. {hLate}h late — penalty will be applied.
            </p>
          ) : null}
          <SubmissionForm assignmentId={assignment.id} kind={assignment.kind} />
        </Card>
      ) : null}

      {isMissed ? (
        <Card>
          <p className="text-sm text-[color:var(--color-error)]">
            Past 72-hour late window. Marked missed; gap auto-created.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
