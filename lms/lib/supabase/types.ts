/**
 * Hand-written TypeScript types matching supabase/schema.sql.
 *
 * If you regenerate via `supabase gen types`, replace this file. The shape
 * follows the @supabase/supabase-js Database<...> contract so client/server
 * helpers infer query results.
 */

export type AssignmentKind =
  | "weekly_report"
  | "discussion_post"
  | "tutorial_completion"
  | "mini_problem"
  | "main_project"
  | "mid_phase_exam"
  | "end_phase_exam"
  | "kinesis_report"
  | "kinesis_project"
  | "project_out"
  | "remediation";

export type AssignmentStatus =
  | "open"
  | "submitted"
  | "graded"
  | "late"
  | "missed"
  | "rebuttal_pending"
  | "rebuttal_resolved"
  | "pending_grade";

export type WeekStatus =
  | "pending"
  | "active"
  | "completed"
  | "pushed"
  | "exam_prep";

export type PhaseStatus = "pending" | "active" | "completed" | "project_out";

export type KinesisStatus = "locked" | "available" | "in_progress" | "completed";

export type RebuttalOutcome = "upheld" | "partially_revised" | "fully_revised";

export interface Phase {
  id: number;
  name: string;
  description: string | null;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: PhaseStatus;
  syllabus_md: string | null;
  final_grade: string | null;
  user_id: string;
}

export interface Week {
  id: number;
  phase_id: number;
  week_number: number;
  topic: string;
  planned_date: string;
  actual_date: string | null;
  status: WeekStatus;
  reading_md: string | null;
  tutorial_md: string | null;
  problem_md: string | null;
  notebooklm_md: string | null;
  generated_at: string | null;
  user_id: string;
}

export interface Assignment {
  id: number;
  week_id: number | null;
  phase_id: number;
  kind: AssignmentKind;
  title: string;
  prompt_md: string | null;
  rubric_md: string | null;
  due_at: string;
  late_window_hours: number;
  max_submissions: number;
  status: AssignmentStatus;
  kinesis_milestone_id: number | null;
  created_at: string | null;
  user_id: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  attempt_number: number;
  submitted_at: string;
  is_late: boolean;
  hours_late: number | null;
  content_md: string | null;
  code: string | null;
  language: string | null;
  filename: string | null;
  github_url: string | null;
  user_id: string;
}

export interface Grade {
  id: number;
  submission_id: number;
  letter_grade: string;
  numeric_grade: number;
  late_penalty_applied: number | null;
  rubric_breakdown: Record<string, unknown> | null;
  feedback_md: string;
  strengths_md: string | null;
  improvements_md: string | null;
  graded_at: string;
  graded_by: string;
  raw_response: Record<string, unknown> | null;
  user_id: string;
}

export interface Rebuttal {
  id: number;
  grade_id: number;
  user_argument_md: string;
  submitted_at: string;
  ai_response_md: string | null;
  outcome: RebuttalOutcome | null;
  revised_grade_id: number | null;
  resolved_at: string | null;
  user_id: string;
}

export interface Gap {
  id: number;
  phase_id: number;
  week_id: number | null;
  topic: string;
  description: string;
  category: string | null;
  identified_at: string;
  identified_from_assignment_id: number | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by_assignment_id: number | null;
  weeks_persisting: number | null;
  user_id: string;
}

export interface KinesisMilestone {
  id: number;
  name: string;
  description_md: string;
  preceding_phase_id: number;
  duration_weeks: number;
  planned_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: KinesisStatus;
  completion_criteria_md: string;
  hardware_confirmed: boolean | null;
  completion_checklist: Record<string, boolean> | null;
  user_id: string;
}

export interface ExamPrepWindow {
  id: number;
  exam_assignment_id: number;
  start_date: string;
  end_date: string;
  duration_days: number;
  study_guide_md: string | null;
  user_id: string;
}

export interface Pushback {
  id: number;
  pushed_at: string;
  reason: string;
  weeks_pushed: number;
  affected_phase_id: number | null;
  affected_week_id: number | null;
  user_id: string;
}

export interface UsageLog {
  id: number;
  called_at: string;
  endpoint: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd_estimate: number | null;
  user_id: string;
}

export interface Notification {
  id: number;
  kind: string;
  title: string;
  body_md: string | null;
  link_url: string | null;
  read_at: string | null;
  emailed_at: string | null;
  created_at: string;
  user_id: string;
}

type Insert<T> = Partial<T> & { user_id: string };
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      phases: { Row: Phase; Insert: Insert<Phase>; Update: Update<Phase> };
      weeks: { Row: Week; Insert: Insert<Week>; Update: Update<Week> };
      assignments: {
        Row: Assignment;
        Insert: Insert<Assignment>;
        Update: Update<Assignment>;
      };
      submissions: {
        Row: Submission;
        Insert: Insert<Submission>;
        Update: Update<Submission>;
      };
      grades: { Row: Grade; Insert: Insert<Grade>; Update: Update<Grade> };
      rebuttals: { Row: Rebuttal; Insert: Insert<Rebuttal>; Update: Update<Rebuttal> };
      gaps: { Row: Gap; Insert: Insert<Gap>; Update: Update<Gap> };
      kinesis_milestones: {
        Row: KinesisMilestone;
        Insert: Insert<KinesisMilestone>;
        Update: Update<KinesisMilestone>;
      };
      exam_prep_windows: {
        Row: ExamPrepWindow;
        Insert: Insert<ExamPrepWindow>;
        Update: Update<ExamPrepWindow>;
      };
      pushbacks: { Row: Pushback; Insert: Insert<Pushback>; Update: Update<Pushback> };
      usage_log: { Row: UsageLog; Insert: Insert<UsageLog>; Update: Update<UsageLog> };
      notifications: {
        Row: Notification;
        Insert: Insert<Notification>;
        Update: Update<Notification>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_gpa: { Args: { p_phase_id: number }; Returns: number | null };
      phase_progress: { Args: { p_phase_id: number }; Returns: number | null };
      bump_persisting_gaps: { Args: Record<string, never>; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
