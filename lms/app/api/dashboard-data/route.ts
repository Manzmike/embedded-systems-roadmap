import { NextResponse } from "next/server";

import { authedHandler } from "@/lib/api";
import {
  currentGpa,
  getActivePhase,
  getActiveWeek,
  getDueThisWeek,
  getOpenGaps,
  getRecentGrades,
  phaseProgressPct,
} from "@/lib/queries";

export const GET = authedHandler(async ({ supabase }) => {
  const phase = await getActivePhase(supabase);
  if (!phase) {
    return NextResponse.json({ phase: null });
  }
  const [week, gpa, progress, due, recent, gaps] = await Promise.all([
    getActiveWeek(supabase, phase.id),
    currentGpa(supabase, phase.id),
    phaseProgressPct(supabase, phase.id),
    getDueThisWeek(supabase),
    getRecentGrades(supabase, 5),
    getOpenGaps(supabase, 3),
  ]);
  return NextResponse.json({ phase, week, gpa, progress, due, recent, gaps });
});
