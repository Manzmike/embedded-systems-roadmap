import Link from "next/link";

import { Markdown } from "@/components/Markdown";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Grade } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

interface GradeCardProps {
  grade: Grade;
  assignmentId: number;
  showRebuttal: boolean;
}

export function GradeCard({ grade, assignmentId, showRebuttal }: GradeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade</CardTitle>
        <span className="text-xs text-[color:var(--color-text-dim)]">
          {formatDateTime(grade.graded_at)} · {grade.graded_by}
        </span>
      </CardHeader>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">
          {grade.letter_grade}
        </span>
        <span className="text-lg text-[color:var(--color-text-dim)] tabular-nums">
          {grade.numeric_grade}
        </span>
        {grade.late_penalty_applied ? (
          <span className="text-sm text-[color:var(--color-warn)]">
            -{grade.late_penalty_applied} late penalty
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="text-sm font-medium text-[color:var(--color-text-dim)]">
            Strengths
          </h3>
          <Markdown source={grade.strengths_md ?? ""} />
        </section>
        <section>
          <h3 className="text-sm font-medium text-[color:var(--color-text-dim)]">
            Improvements
          </h3>
          <Markdown source={grade.improvements_md ?? ""} />
        </section>
      </div>

      <section className="mt-4">
        <h3 className="text-sm font-medium text-[color:var(--color-text-dim)]">
          Feedback
        </h3>
        <Markdown source={grade.feedback_md} />
      </section>

      {grade.rubric_breakdown ? (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-[color:var(--color-text-dim)]">
            Rubric breakdown
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs">
{JSON.stringify(grade.rubric_breakdown, null, 2)}
          </pre>
        </section>
      ) : null}

      {showRebuttal ? (
        <div className="mt-4">
          <Link
            href={`/assignment/${assignmentId}/rebuttal`}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm no-underline"
          >
            Request rebuttal
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
