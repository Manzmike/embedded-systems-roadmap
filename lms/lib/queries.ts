/**
 * Server-side query helpers. Each takes the user-bound supabase client (so RLS
 * applies) and returns typed rows. Keep this file thin — page components
 * compose these directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Assignment,
  Database,
  Gap,
  Grade,
  Phase,
  Submission,
  Week,
} from "@/lib/supabase/types";

type DB = SupabaseClient<Database>;

export async function getActivePhase(supabase: DB): Promise<Phase | null> {
  const { data } = await supabase
    .from("phases")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function getAllPhases(supabase: DB): Promise<Phase[]> {
  const { data } = await supabase.from("phases").select("*").order("id");
  return data ?? [];
}

export async function getPhase(supabase: DB, id: number): Promise<Phase | null> {
  const { data } = await supabase
    .from("phases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getWeeksForPhase(
  supabase: DB,
  phaseId: number,
): Promise<Week[]> {
  const { data } = await supabase
    .from("weeks")
    .select("*")
    .eq("phase_id", phaseId)
    .order("week_number");
  return data ?? [];
}

export async function getActiveWeek(
  supabase: DB,
  phaseId: number,
): Promise<Week | null> {
  const { data } = await supabase
    .from("weeks")
    .select("*")
    .eq("phase_id", phaseId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function getWeek(supabase: DB, id: number): Promise<Week | null> {
  const { data } = await supabase
    .from("weeks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getAssignmentsForWeek(
  supabase: DB,
  weekId: number,
): Promise<Assignment[]> {
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("week_id", weekId)
    .order("due_at");
  return data ?? [];
}

export async function getAssignment(
  supabase: DB,
  id: number,
): Promise<Assignment | null> {
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getDueThisWeek(
  supabase: DB,
): Promise<Assignment[]> {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .lte("due_at", in7.toISOString())
    .neq("status", "graded")
    .neq("status", "rebuttal_resolved")
    .order("due_at");
  return data ?? [];
}

export async function getRecentGrades(
  supabase: DB,
  limit = 5,
): Promise<(Grade & { submission: Submission & { assignment: Assignment } })[]> {
  const { data } = await supabase
    .from("grades")
    .select("*, submission:submissions(*, assignment:assignments(*))")
    .order("graded_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as never;
}

export async function getOpenGaps(supabase: DB, limit?: number): Promise<Gap[]> {
  let q = supabase
    .from("gaps")
    .select("*")
    .eq("resolved", false)
    .order("weeks_persisting", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return data ?? [];
}

export async function getSubmissionsForAssignment(
  supabase: DB,
  assignmentId: number,
): Promise<(Submission & { grades: Grade[] })[]> {
  const { data } = await supabase
    .from("submissions")
    .select("*, grades(*)")
    .eq("assignment_id", assignmentId)
    .order("attempt_number", { ascending: false });
  return (data ?? []) as never;
}

export async function currentGpa(
  supabase: DB,
  phaseId: number,
): Promise<number | null> {
  const { data } = await supabase.rpc("current_gpa", { p_phase_id: phaseId });
  return (data as number | null) ?? null;
}

export async function phaseProgressPct(
  supabase: DB,
  phaseId: number,
): Promise<number | null> {
  const { data } = await supabase.rpc("phase_progress", { p_phase_id: phaseId });
  return (data as number | null) ?? null;
}
