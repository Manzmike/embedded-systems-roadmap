import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";

const Body = z.object({
  milestoneId: z.number().int().positive(),
  completionChecklist: z.record(z.string(), z.boolean()),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body");
  const { milestoneId, completionChecklist } = parsed.data;

  // every box must be checked
  if (!Object.values(completionChecklist).every(Boolean)) {
    return badRequest("Not all completion criteria are checked");
  }

  // every kinesis_report and kinesis_project must be graded
  const { data: assignments } = await supabase
    .from("assignments")
    .select("status")
    .eq("kinesis_milestone_id", milestoneId);
  const ungraded = (assignments ?? []).filter(
    (a) => a.status !== "graded" && a.status !== "rebuttal_resolved",
  );
  if (ungraded.length > 0) {
    return badRequest("All milestone assignments must be graded first");
  }

  await supabase
    .from("kinesis_milestones")
    .update({
      status: "completed",
      actual_end: new Date().toISOString().slice(0, 10),
      completion_checklist: completionChecklist,
    })
    .eq("id", milestoneId);

  // Unlock the next phase if there is one
  const { data: m } = await supabase
    .from("kinesis_milestones")
    .select("preceding_phase_id")
    .eq("id", milestoneId)
    .maybeSingle();
  if (m) {
    const nextPhaseId = m.preceding_phase_id + 1;
    const { data: nextPhase } = await supabase
      .from("phases")
      .select("status")
      .eq("id", nextPhaseId)
      .maybeSingle();
    if (nextPhase && nextPhase.status === "pending") {
      await supabase
        .from("phases")
        .update({
          status: "active",
          actual_start: new Date().toISOString().slice(0, 10),
        })
        .eq("id", nextPhaseId);
    }
  }

  await supabase.from("notifications").insert({
    kind: "kinesis_completed",
    title: "KINESIS milestone completed",
    body_md: "Next phase unlocked.",
    link_url: `/kinesis/${milestoneId}`,
    user_id: user.id,
  });

  return NextResponse.json({ ok: true });
});
