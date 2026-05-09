import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { rubricFor } from "@/lib/rubrics";

const Body = z.object({
  milestoneId: z.number().int().positive(),
  hardwareConfirmed: z.boolean(),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body");
  const { milestoneId, hardwareConfirmed } = parsed.data;
  if (!hardwareConfirmed) return badRequest("Hardware must be confirmed");

  const { data: m } = await supabase
    .from("kinesis_milestones")
    .select("*")
    .eq("id", milestoneId)
    .maybeSingle();
  if (!m) return badRequest("Milestone not found");

  // Validate prior phase complete
  const { data: priorPhase } = await supabase
    .from("phases")
    .select("status")
    .eq("id", m.preceding_phase_id)
    .maybeSingle();
  if (!priorPhase) return badRequest("Preceding phase missing");
  if (priorPhase.status !== "completed") {
    return badRequest("Preceding phase must be completed first");
  }

  // Validate gap tracker clear (or accept project-out completion as proxy)
  const { count: openGaps } = await supabase
    .from("gaps")
    .select("*", { count: "exact", head: true })
    .eq("phase_id", m.preceding_phase_id)
    .eq("resolved", false);
  if ((openGaps ?? 0) > 0) {
    return badRequest("Open gaps remain; complete project-out first");
  }

  await supabase
    .from("kinesis_milestones")
    .update({
      status: "in_progress",
      hardware_confirmed: true,
      actual_start: new Date().toISOString().slice(0, 10),
    })
    .eq("id", milestoneId);

  // Create kinesis_report + kinesis_project assignments if not present
  const { data: existing } = await supabase
    .from("assignments")
    .select("kind")
    .eq("kinesis_milestone_id", milestoneId);
  const existingKinds = new Set((existing ?? []).map((a) => a.kind));

  const due = new Date();
  due.setDate(due.getDate() + m.duration_weeks * 7);

  const inserts: Array<Record<string, unknown>> = [];
  if (!existingKinds.has("kinesis_report")) {
    inserts.push({
      kind: "kinesis_report",
      title: `${m.name} — Written report`,
      prompt_md: `Write the milestone report for ${m.name}. Address every completion criterion. Include diagrams, measurements, and tradeoff analysis.\n\nCriteria:\n${m.completion_criteria_md}`,
      rubric_md: rubricFor.kinesis_report,
      due_at: due.toISOString(),
      late_window_hours: 168,
      max_submissions: 3,
      phase_id: m.preceding_phase_id,
      kinesis_milestone_id: milestoneId,
      user_id: user.id,
    });
  }
  if (!existingKinds.has("kinesis_project")) {
    inserts.push({
      kind: "kinesis_project",
      title: `${m.name} — Code/firmware deliverable`,
      prompt_md: `Submit the code/firmware deliverable for ${m.name}.\n\n${m.description_md}`,
      rubric_md: rubricFor.kinesis_project,
      due_at: due.toISOString(),
      late_window_hours: 168,
      max_submissions: 3,
      phase_id: m.preceding_phase_id,
      kinesis_milestone_id: milestoneId,
      user_id: user.id,
    });
  }
  if (inserts.length > 0) {
    await supabase.from("assignments").insert(inserts);
  }

  return NextResponse.json({ ok: true });
});
