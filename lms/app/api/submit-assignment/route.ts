import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { gradeSubmission } from "@/lib/grading";
import { sanitizeUserInput } from "@/lib/sanitize";
import { hoursLate } from "@/lib/utils";

const Body = z.object({
  assignmentId: z.number().int().positive(),
  content_md: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body");
  const { assignmentId } = parsed.data;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) return badRequest("Assignment not found");

  const due = new Date(assignment.due_at);
  const hLate = hoursLate(due);
  const isLate = hLate > 0;
  const inLateWindow = !isLate || hLate < assignment.late_window_hours;

  if (!inLateWindow) {
    // Past late window — auto-mark missed and create gap.
    await supabase
      .from("assignments")
      .update({ status: "missed" })
      .eq("id", assignmentId);
    await supabase.from("gaps").insert({
      phase_id: assignment.phase_id,
      week_id: assignment.week_id,
      topic: assignment.title,
      description: `Missed past 72-hour late window: ${assignment.title}`,
      category: "missed_assignment",
      identified_from_assignment_id: assignment.id,
      user_id: user.id,
    });
    return NextResponse.json({ error: "Past late window — marked missed" }, { status: 410 });
  }

  if (
    assignment.status !== "open" &&
    assignment.status !== "submitted" &&
    assignment.status !== "late" &&
    assignment.status !== "pending_grade"
  ) {
    return badRequest(`Assignment is ${assignment.status}; cannot submit`);
  }

  const { data: existing } = await supabase
    .from("submissions")
    .select("attempt_number")
    .eq("assignment_id", assignmentId)
    .order("attempt_number", { ascending: false })
    .limit(1);
  const lastAttempt = existing?.[0]?.attempt_number ?? 0;
  if (lastAttempt >= assignment.max_submissions) {
    return badRequest("Maximum submissions reached");
  }

  const content = parsed.data.content_md ? sanitizeUserInput(parsed.data.content_md) : null;
  const code = parsed.data.code ? sanitizeUserInput(parsed.data.code) : null;

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      attempt_number: lastAttempt + 1,
      submitted_at: new Date().toISOString(),
      is_late: isLate,
      hours_late: isLate ? hLate : 0,
      content_md: content,
      code,
      language: parsed.data.language ?? null,
      filename: parsed.data.filename ?? null,
      github_url: parsed.data.github_url ?? null,
      user_id: user.id,
    })
    .select()
    .single();
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  // Mark as pending_grade so the user sees the right status if grading throws.
  await supabase
    .from("assignments")
    .update({ status: "pending_grade" })
    .eq("id", assignmentId);

  try {
    const grade = await gradeSubmission({
      supabase,
      userId: user.id,
      submissionId: submission.id,
    });
    return NextResponse.json({ ok: true, gradeId: grade.id });
  } catch (err) {
    // Leave assignment in pending_grade so the user can retry from admin
    // tools or via /api/grade-submission.
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Grading failed",
        submissionId: submission.id,
      },
      { status: 502 },
    );
  }
});
