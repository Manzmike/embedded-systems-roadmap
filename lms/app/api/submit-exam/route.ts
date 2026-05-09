import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { gradeSubmission } from "@/lib/grading";
import { sanitizeUserInput } from "@/lib/sanitize";
import { hoursLate } from "@/lib/utils";

const Body = z.object({
  examAssignmentId: z.number().int().positive(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer_md: z.string(),
      }),
    )
    .min(1),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body");
  const { examAssignmentId, answers } = parsed.data;

  const { data: exam } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", examAssignmentId)
    .maybeSingle();
  if (!exam) return badRequest("Exam not found");

  // Late check
  const hLate = hoursLate(exam.due_at);
  const isLate = hLate > 0;
  if (isLate && hLate >= exam.late_window_hours) {
    await supabase
      .from("assignments")
      .update({ status: "missed" })
      .eq("id", examAssignmentId);
    return NextResponse.json({ error: "Past late window" }, { status: 410 });
  }

  // Sanitize all answers
  const cleanAnswers = answers.map((a) => ({
    questionId: a.questionId,
    answer_md: sanitizeUserInput(a.answer_md),
  }));

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .insert({
      assignment_id: examAssignmentId,
      attempt_number: 1,
      submitted_at: new Date().toISOString(),
      is_late: isLate,
      hours_late: isLate ? hLate : 0,
      content_md: JSON.stringify(cleanAnswers),
      user_id: user.id,
    })
    .select()
    .single();
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  await supabase
    .from("assignments")
    .update({ status: "pending_grade" })
    .eq("id", examAssignmentId);

  try {
    const grade = await gradeSubmission({
      supabase,
      userId: user.id,
      submissionId: submission.id,
    });
    return NextResponse.json({ ok: true, gradeId: grade.id });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Grading failed",
        submissionId: submission.id,
      },
      { status: 502 },
    );
  }
});
