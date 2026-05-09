import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { callClaude } from "@/lib/anthropic";
import { generateTutorialAndProblemPrompt } from "@/lib/prompts/generate";
import { rubricFor } from "@/lib/rubrics";
import { PROFESSOR_SYSTEM } from "@/lib/prompts/system";
import type { AssignmentKind } from "@/lib/supabase/types";

const Body = z.object({
  weekId: z.number().int().positive(),
  regenerate: z.boolean().optional(),
});

interface AssignmentTemplate {
  kind: AssignmentKind;
  title: (topic: string) => string;
  due: (planned: Date) => Date;
  late: number;
  max: number;
  prompt?: (week: { topic: string; week_number: number }) => string;
}

// Cycle anchor: each week starts on planned_date (Monday).
// Tue/Fri 8 PM PT, Sat 7 AM PT, Sun 6 PM PT.
function setHour(date: Date, day: number, hour: number) {
  const d = new Date(date);
  const offset = day - d.getDay();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const TEMPLATES: AssignmentTemplate[] = [
  {
    kind: "discussion_post",
    title: (t) => `Discussion #1 — ${t}`,
    due: (planned) => setHour(planned, 2, 20), // Tue 8pm
    late: 72,
    max: 1,
    prompt: (w) =>
      `Write a 300-600 word discussion post on a specific concept from this week's reading on ${w.topic}. Connect it to a prior week's topic and to a real engineering scenario you've thought about.`,
  },
  {
    kind: "discussion_post",
    title: (t) => `Discussion #2 — ${t}`,
    due: (planned) => setHour(planned, 5, 20), // Fri 8pm
    late: 72,
    max: 1,
    prompt: (w) =>
      `Write a 300-600 word discussion post that takes a position on a tradeoff raised in this week's reading on ${w.topic}. Defend it against the counter-argument.`,
  },
  {
    kind: "tutorial_completion",
    title: (t) => `Tutorial completion — ${t}`,
    due: (planned) => setHour(planned, 6, 13), // Sat 1pm
    late: 72,
    max: 1,
    prompt: () =>
      "Answer all conceptual questions from both tutorials cold from memory. Do not reread the tutorials while answering.",
  },
  {
    kind: "mini_problem",
    title: (t) => `Mini problems — ${t}`,
    due: (planned) => setHour(planned, 0, 6), // Sun 6am (next week)
    late: 72,
    max: 1,
    prompt: () =>
      "Submit your answers to the mini work section in PROBLEM.md (conceptual + small code problems).",
  },
  {
    kind: "main_project",
    title: (t) => `Main project — ${t}`,
    due: (planned) => setHour(planned, 0, 12), // Sun noon
    late: 72,
    max: 1,
    prompt: () =>
      "Submit your main project: code + the 7+ evaluation answers from PROBLEM.md.",
  },
  {
    kind: "weekly_report",
    title: (t) => `Weekly report — ${t}`,
    due: (planned) => setHour(planned, 0, 18), // Sun 6pm
    late: 72,
    max: 1,
    prompt: () =>
      "Submit the weekly report covering reading synthesis, cold-recall answers, code review of your main project, identified gaps, and writing quality.",
  },
];

function splitDelimited(text: string) {
  // Allow optional surrounding whitespace and trailing newlines.
  const re = /<<<TUTORIAL>>>([\s\S]*?)<<<PROBLEM>>>([\s\S]*?)<<<NOTEBOOKLM>>>([\s\S]*)/;
  const m = text.match(re);
  if (!m) return null;
  return {
    tutorial: m[1].trim(),
    problem: m[2].trim(),
    notebooklm: m[3].trim(),
  };
}

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("weekId required");
  const { weekId, regenerate } = parsed.data;

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

  const { data: priorGaps } = await supabase
    .from("gaps")
    .select("topic, description")
    .eq("phase_id", week.phase_id)
    .eq("resolved", false)
    .order("weeks_persisting", { ascending: false })
    .limit(10);

  const userPrompt = generateTutorialAndProblemPrompt({
    phase,
    week,
    priorWeeks: priorWeeks ?? [],
    priorGaps: priorGaps ?? [],
  });

  const result = await callClaude({
    endpoint: "generate-week",
    userId: user.id,
    systemPrompt: PROFESSOR_SYSTEM,
    userPrompt,
    maxTokens: 16384,
  });

  const split = splitDelimited(result.text);
  if (!split) {
    return NextResponse.json(
      { error: "Could not parse <<<TUTORIAL>>>/<<<PROBLEM>>>/<<<NOTEBOOKLM>>> blocks", raw: result.text.slice(0, 500) },
      { status: 502 },
    );
  }

  await supabase
    .from("weeks")
    .update({
      tutorial_md: split.tutorial,
      problem_md: split.problem,
      notebooklm_md: split.notebooklm,
      generated_at: new Date().toISOString(),
    })
    .eq("id", weekId);

  // Idempotent assignment creation. Skip kinds that already exist for this
  // week unless regenerate flag is set.
  const { data: existing } = await supabase
    .from("assignments")
    .select("kind, id")
    .eq("week_id", weekId);
  const existingKinds = new Set((existing ?? []).map((a) => a.kind));

  const planned = new Date(week.planned_date);
  const existingTitles = new Set(
    (existing ?? []).map((a) => (a as never as { title: string }).title),
  );
  const inserts: { kind: AssignmentKind; title: string; prompt_md: string; rubric_md: string; due_at: string; late_window_hours: number; max_submissions: number; week_id: number; phase_id: number; user_id: string }[] = [];
  for (const t of TEMPLATES) {
    const desiredTitle = t.title(week.topic);
    if (!regenerate) {
      // Discussion posts share kind across two slots, so dedupe by title.
      if (t.kind === "discussion_post") {
        if (existingTitles.has(desiredTitle)) continue;
      } else if (existingKinds.has(t.kind)) {
        continue;
      }
    }
    inserts.push({
      kind: t.kind,
      title: desiredTitle,
      prompt_md: t.prompt?.({ topic: week.topic, week_number: week.week_number }) ?? "",
      rubric_md: rubricFor[t.kind],
      due_at: t.due(planned).toISOString(),
      late_window_hours: t.late,
      max_submissions: t.max,
      week_id: weekId,
      phase_id: week.phase_id,
      user_id: user.id,
    });
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("assignments").insert(inserts);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, inserted: inserts.length });
});
