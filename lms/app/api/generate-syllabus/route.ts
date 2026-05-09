import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude } from "@/lib/anthropic";
import { generateSyllabusPrompt } from "@/lib/prompts/generate";
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

  // Don't regenerate after the phase has started — syllabi are read-only post-start.
  if (phase.status !== "pending" && phase.syllabus_md) {
    return badRequest("Phase already started; syllabus is read-only");
  }

  const result = await callClaude({
    endpoint: "generate-syllabus",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt: generateSyllabusPrompt(phase),
    maxTokens: 8000,
  });

  await supabase
    .from("phases")
    .update({ syllabus_md: result.text })
    .eq("id", phaseId);

  return NextResponse.json({ ok: true });
});
