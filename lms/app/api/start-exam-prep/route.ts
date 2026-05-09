import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude } from "@/lib/anthropic";
import { generateExamPrepGuidePrompt } from "@/lib/prompts/generate";
import { PROFESSOR_SYSTEM } from "@/lib/prompts/system";

const Body = z.object({
  examAssignmentId: z.number().int().positive(),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("examAssignmentId required");
  const { examAssignmentId } = parsed.data;

  const { data: exam } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", examAssignmentId)
    .maybeSingle();
  if (!exam) return badRequest("Exam not found");
  if (exam.kind !== "mid_phase_exam" && exam.kind !== "end_phase_exam") {
    return badRequest("Not an exam assignment");
  }

  // weeks covered: for mid-phase, weeks 1..(due-week-1); for end-phase, all weeks of the phase
  const isEndPhase = exam.kind === "end_phase_exam";
  const dueWeek = exam.week_id;
  const { data: weeks } = await supabase
    .from("weeks")
    .select("week_number, topic")
    .eq("phase_id", exam.phase_id)
    .order("week_number");
  const weeksCovered = isEndPhase
    ? weeks ?? []
    : (weeks ?? []).filter((w) => !dueWeek || w.week_number <= 24);

  const { data: phase } = await supabase
    .from("phases")
    .select("*")
    .eq("id", exam.phase_id)
    .maybeSingle();
  if (!phase) return badRequest("Phase not found");

  const result = await callClaude({
    endpoint: "start-exam-prep",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt: generateExamPrepGuidePrompt({
      phase,
      weeksCovered,
      isEndPhase,
    }),
    maxTokens: 8000,
  });

  const durationDays = isEndPhase ? 5 : 3;
  const startDate = new Date(exam.due_at);
  startDate.setDate(startDate.getDate() - durationDays);
  const endDate = new Date(exam.due_at);

  const { data: window, error: winErr } = await supabase
    .from("exam_prep_windows")
    .insert({
      exam_assignment_id: examAssignmentId,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      duration_days: durationDays,
      study_guide_md: result.text,
      user_id: user.id,
    })
    .select()
    .single();
  if (winErr) return NextResponse.json({ error: winErr.message }, { status: 500 });

  // Mark weeks within window as exam_prep so generation flow skips them.
  await supabase
    .from("weeks")
    .update({ status: "exam_prep" })
    .eq("phase_id", exam.phase_id)
    .gte("planned_date", window.start_date)
    .lte("planned_date", window.end_date);

  return NextResponse.json({ ok: true, windowId: window.id });
});
