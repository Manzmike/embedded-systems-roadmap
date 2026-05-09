import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude } from "@/lib/anthropic";
import { generateReadingPrompt } from "@/lib/prompts/generate";
import { PROFESSOR_SYSTEM } from "@/lib/prompts/system";

const Body = z.object({ weekId: z.number().int().positive() });

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("weekId required");
  const { weekId } = parsed.data;

  const { data: week } = await supabase
    .from("weeks")
    .select("*")
    .eq("id", weekId)
    .maybeSingle();
  if (!week) return badRequest("Week not found");

  const { data: phase } = await supabase
    .from("phases")
    .select("*")
    .eq("id", week.phase_id)
    .maybeSingle();
  if (!phase) return badRequest("Phase not found");

  const { data: priorWeeks } = await supabase
    .from("weeks")
    .select("week_number, topic")
    .eq("phase_id", week.phase_id)
    .lt("week_number", week.week_number)
    .order("week_number");

  const userPrompt = generateReadingPrompt({
    phase,
    week,
    priorWeeks: priorWeeks ?? [],
  });

  const result = await callClaude({
    endpoint: "generate-reading",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt,
    maxTokens: 6000,
  });

  await supabase
    .from("weeks")
    .update({
      reading_md: result.text,
      generated_at: new Date().toISOString(),
    })
    .eq("id", weekId);

  return NextResponse.json({ ok: true });
});
