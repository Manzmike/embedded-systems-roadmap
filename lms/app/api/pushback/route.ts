import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";

const Body = z.object({
  weekId: z.number().int().positive(),
  reason: z.string().min(3),
  weeksPushed: z.number().int().min(1).max(8),
  cascade: z.boolean().default(true),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body");
  const { weekId, reason, weeksPushed, cascade } = parsed.data;

  const { data: week } = await supabase
    .from("weeks")
    .select("*")
    .eq("id", weekId)
    .maybeSingle();
  if (!week) return badRequest("Week not found");

  await supabase.from("pushbacks").insert({
    reason,
    weeks_pushed: weeksPushed,
    affected_phase_id: week.phase_id,
    affected_week_id: weekId,
    user_id: user.id,
  });

  // Mark this week pushed and shift its planned_date forward
  const newDate = new Date(week.planned_date);
  newDate.setDate(newDate.getDate() + weeksPushed * 7);
  await supabase
    .from("weeks")
    .update({ status: "pushed", planned_date: newDate.toISOString().slice(0, 10) })
    .eq("id", weekId);

  // Cascade subsequent weeks in the same phase
  if (cascade) {
    const { data: laterWeeks } = await supabase
      .from("weeks")
      .select("id, planned_date")
      .eq("phase_id", week.phase_id)
      .gt("week_number", week.week_number);
    for (const w of laterWeeks ?? []) {
      const d = new Date(w.planned_date);
      d.setDate(d.getDate() + weeksPushed * 7);
      await supabase
        .from("weeks")
        .update({ planned_date: d.toISOString().slice(0, 10) })
        .eq("id", w.id);
    }

    // Also push the phase end
    const { data: phase } = await supabase
      .from("phases")
      .select("planned_end")
      .eq("id", week.phase_id)
      .maybeSingle();
    if (phase) {
      const pd = new Date(phase.planned_end);
      pd.setDate(pd.getDate() + weeksPushed * 7);
      await supabase
        .from("phases")
        .update({ planned_end: pd.toISOString().slice(0, 10) })
        .eq("id", week.phase_id);
    }
  }

  return NextResponse.json({ ok: true });
});
