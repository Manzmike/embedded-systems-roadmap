import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude } from "@/lib/anthropic";
import { generateProjectOutPrompt } from "@/lib/prompts/generate";
import { rubricFor } from "@/lib/rubrics";
import { PROFESSOR_SYSTEM } from "@/lib/prompts/system";

const Body = z.object({ phaseId: z.number().int().positive() });

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("phaseId required");
  const { phaseId } = parsed.data;

  const { data: phase } = await supabase
    .from("phases")
    .select("*")
    .eq("id", phaseId)
    .maybeSingle();
  if (!phase) return badRequest("Phase not found");
  if (phase.status !== "completed" && phase.status !== "project_out") {
    return badRequest("Phase must be completed first");
  }

  const { data: gaps } = await supabase
    .from("gaps")
    .select("topic, description")
    .eq("phase_id", phaseId)
    .eq("resolved", false);
  if (!gaps || gaps.length === 0) {
    return badRequest("No open gaps; project-out is not required");
  }

  const result = await callClaude({
    endpoint: "project-out",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt: generateProjectOutPrompt({ phase, gapTopics: gaps }),
    maxTokens: 8000,
  });

  // Two-week window for project-out by default.
  const due = new Date();
  due.setDate(due.getDate() + 14);

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      kind: "project_out",
      title: `${phase.name} — Project-Out Capstone`,
      prompt_md: result.text,
      rubric_md: rubricFor.project_out,
      due_at: due.toISOString(),
      late_window_hours: 0,
      max_submissions: 1,
      phase_id: phaseId,
      user_id: user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("phases")
    .update({ status: "project_out" })
    .eq("id", phaseId);

  return NextResponse.json({ ok: true, assignmentId: assignment.id });
});
