import type { SupabaseClient } from "@supabase/supabase-js";

import { callClaude, extractJson } from "@/lib/anthropic";
import {
  evaluateRebuttalPrompt,
  gradeDiscussionPostPrompt,
  gradeExamPrompt,
  gradeKinesisProjectPrompt,
  gradeKinesisReportPrompt,
  gradeMainProjectPrompt,
  gradeMiniProblemPrompt,
  gradeProjectOutPrompt,
  gradeTutorialCompletionPrompt,
  gradeWeeklyReportPrompt,
} from "@/lib/prompts/grade";
import { GRADER_SYSTEM } from "@/lib/prompts/system";
import type {
  Assignment,
  AssignmentKind,
  Database,
  Gap,
  Submission,
} from "@/lib/supabase/types";
import { latePenalty, letterFromNumeric } from "@/lib/utils";

type DB = SupabaseClient<Database>;

interface GradeJsonResponse {
  letter_grade: string;
  numeric_grade: number;
  rubric_breakdown: Record<string, unknown>;
  feedback_md: string;
  strengths_md: string;
  improvements_md: string;
  identified_gaps?: { topic: string; description: string; category?: string }[];
}

const PROMPT_BUILDERS: Record<
  AssignmentKind,
  (args: {
    assignment: Assignment;
    submission: Submission;
    priorGaps: Pick<Gap, "topic" | "description">[];
  }) => string
> = {
  weekly_report: gradeWeeklyReportPrompt,
  discussion_post: gradeDiscussionPostPrompt,
  tutorial_completion: gradeTutorialCompletionPrompt,
  mini_problem: gradeMiniProblemPrompt,
  main_project: gradeMainProjectPrompt,
  mid_phase_exam: gradeExamPrompt,
  end_phase_exam: gradeExamPrompt,
  kinesis_report: gradeKinesisReportPrompt,
  kinesis_project: gradeKinesisProjectPrompt,
  project_out: gradeProjectOutPrompt,
  remediation: gradeMainProjectPrompt,
};

/**
 * Grade a submission via Claude, write the grade row, identify gaps, update
 * assignment status. Throws on parse / DB errors so callers can surface to UI
 * and mark the submission as pending_grade.
 */
export async function gradeSubmission(args: {
  supabase: DB;
  userId: string;
  submissionId: number;
}) {
  const { supabase, userId, submissionId } = args;

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (subErr) throw new Error(subErr.message);
  if (!submission) throw new Error("Submission not found");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .maybeSingle();
  if (!assignment) throw new Error("Assignment not found");

  const { data: priorGaps } = await supabase
    .from("gaps")
    .select("topic, description")
    .eq("phase_id", assignment.phase_id)
    .eq("resolved", false)
    .order("weeks_persisting", { ascending: false })
    .limit(10);

  const builder = PROMPT_BUILDERS[assignment.kind];
  const userPrompt = builder({
    assignment,
    submission,
    priorGaps: priorGaps ?? [],
  });

  const result = await callClaude({
    endpoint: `grade-${assignment.kind}`,
    userId,
    systemPrompt: GRADER_SYSTEM,
    userPrompt,
    maxTokens: 6000,
  });

  let parsed: GradeJsonResponse;
  try {
    parsed = extractJson<GradeJsonResponse>(result.text);
  } catch {
    throw new Error("Failed to parse grader JSON");
  }

  const lateHours = submission.hours_late ?? 0;
  const penalty = submission.is_late ? latePenalty(lateHours) : 0;
  const adjusted = Math.max(0, Math.min(100, Math.round(parsed.numeric_grade) - penalty));
  const letter =
    penalty > 0 ? letterFromNumeric(adjusted) : parsed.letter_grade;

  const { data: gradeRow, error: gradeErr } = await supabase
    .from("grades")
    .insert({
      submission_id: submission.id,
      letter_grade: letter,
      numeric_grade: adjusted,
      late_penalty_applied: penalty,
      rubric_breakdown: parsed.rubric_breakdown,
      feedback_md: parsed.feedback_md,
      strengths_md: parsed.strengths_md,
      improvements_md: parsed.improvements_md,
      raw_response: parsed as unknown as Record<string, unknown>,
      user_id: userId,
    })
    .select()
    .single();
  if (gradeErr) throw new Error(gradeErr.message);

  if (parsed.identified_gaps && parsed.identified_gaps.length > 0) {
    await supabase.from("gaps").insert(
      parsed.identified_gaps.map((g) => ({
        phase_id: assignment.phase_id,
        week_id: assignment.week_id,
        topic: g.topic,
        description: g.description,
        category: g.category ?? null,
        identified_from_assignment_id: assignment.id,
        user_id: userId,
      })),
    );
  }

  await supabase
    .from("assignments")
    .update({ status: "graded" })
    .eq("id", assignment.id);

  await supabase.from("notifications").insert({
    kind: "grade_posted",
    title: `${letter} on ${assignment.title}`,
    body_md: parsed.improvements_md.slice(0, 500),
    link_url: `/assignment/${assignment.id}`,
    user_id: userId,
  });

  return gradeRow;
}

export async function evaluateRebuttal(args: {
  supabase: DB;
  userId: string;
  gradeId: number;
  argumentMd: string;
}) {
  const { supabase, userId, gradeId, argumentMd } = args;

  const { data: original } = await supabase
    .from("grades")
    .select("*")
    .eq("id", gradeId)
    .maybeSingle();
  if (!original) throw new Error("Grade not found");

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", original.submission_id)
    .maybeSingle();
  if (!submission) throw new Error("Submission not found");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .maybeSingle();
  if (!assignment) throw new Error("Assignment not found");

  const userPrompt = evaluateRebuttalPrompt({
    assignment,
    submission,
    originalGrade: {
      letter_grade: original.letter_grade,
      numeric_grade: original.numeric_grade,
      rubric_breakdown: original.rubric_breakdown,
      feedback_md: original.feedback_md,
    },
    argumentMd,
  });

  const result = await callClaude({
    endpoint: "rebut-grade",
    userId,
    systemPrompt: GRADER_SYSTEM,
    userPrompt,
    maxTokens: 5000,
  });

  interface RebuttalJsonResponse {
    outcome: "upheld" | "partially_revised" | "fully_revised";
    ai_response_md: string;
    revised_grade: GradeJsonResponse | null;
  }

  let parsed: RebuttalJsonResponse;
  try {
    parsed = extractJson<RebuttalJsonResponse>(result.text);
  } catch {
    throw new Error("Failed to parse rebuttal JSON");
  }

  let revisedGradeId: number | null = null;
  if (parsed.revised_grade) {
    const r = parsed.revised_grade;
    const { data: newGrade, error } = await supabase
      .from("grades")
      .insert({
        submission_id: submission.id,
        letter_grade: r.letter_grade,
        numeric_grade: r.numeric_grade,
        late_penalty_applied: original.late_penalty_applied ?? 0,
        rubric_breakdown: r.rubric_breakdown,
        feedback_md: r.feedback_md,
        strengths_md: r.strengths_md,
        improvements_md: r.improvements_md,
        raw_response: r as unknown as Record<string, unknown>,
        graded_by: "claude_api_rebuttal",
        user_id: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    revisedGradeId = newGrade.id;
  }

  const { data: rebuttal, error: rErr } = await supabase
    .from("rebuttals")
    .insert({
      grade_id: original.id,
      user_argument_md: argumentMd,
      ai_response_md: parsed.ai_response_md,
      outcome: parsed.outcome,
      revised_grade_id: revisedGradeId,
      resolved_at: new Date().toISOString(),
      user_id: userId,
    })
    .select()
    .single();
  if (rErr) throw new Error(rErr.message);

  await supabase
    .from("assignments")
    .update({
      status: parsed.outcome === "upheld" ? "graded" : "rebuttal_resolved",
    })
    .eq("id", assignment.id);

  return rebuttal;
}
