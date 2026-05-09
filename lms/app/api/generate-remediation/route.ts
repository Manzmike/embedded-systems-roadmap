import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude, extractJson } from "@/lib/anthropic";
import { generateRemediationPrompt } from "@/lib/prompts/generate";
import { rubricFor } from "@/lib/rubrics";
import { PROFESSOR_SYSTEM } from "@/lib/prompts/system";

const Body = z.object({ failedProjectOutId: z.number().int().positive() });

interface RemediationResponse {
  assignments: {
    topic: string;
    title: string;
    prompt_md: string;
    rubric_md: string;
    estimated_hours: number;
  }[];
}

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("failedProjectOutId required");
  const { failedProjectOutId } = parsed.data;

  const { data: capstone } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", failedProjectOutId)
    .maybeSingle();
  if (!capstone) return badRequest("Capstone not found");
  if (capstone.kind !== "project_out") return badRequest("Not a project-out");

  // Re-derive failed topics from the open gap list of this phase.
  const { data: gaps } = await supabase
    .from("gaps")
    .select("topic, description")
    .eq("phase_id", capstone.phase_id)
    .eq("resolved", false);
  if (!gaps || gaps.length === 0) {
    return badRequest("No open gaps to remediate");
  }

  const result = await callClaude({
    endpoint: "generate-remediation",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt: generateRemediationPrompt({ failedTopics: gaps }),
    maxTokens: 6000,
  });

  let parsedResp: RemediationResponse;
  try {
    parsedResp = extractJson<RemediationResponse>(result.text);
  } catch {
    return NextResponse.json({ error: "Could not parse remediation JSON" }, { status: 502 });
  }

  const due = new Date();
  due.setDate(due.getDate() + 5);

  const inserts = parsedResp.assignments.map((a) => ({
    kind: "remediation" as const,
    title: a.title,
    prompt_md: a.prompt_md,
    rubric_md: a.rubric_md || rubricFor.remediation,
    due_at: due.toISOString(),
    late_window_hours: 168,
    max_submissions: 3,
    phase_id: capstone.phase_id,
    user_id: user.id,
  }));

  const { data: rows, error } = await supabase
    .from("assignments")
    .insert(inserts)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, assignmentIds: (rows ?? []).map((r) => r.id) });
});
