import { Badge } from "@/components/ui/Badge";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { hoursLate, hoursUntil } from "@/lib/utils";

const LABELS: Record<AssignmentStatus, string> = {
  open: "Open",
  submitted: "Submitted",
  graded: "Graded",
  late: "Late",
  missed: "Missed",
  rebuttal_pending: "Rebuttal pending",
  rebuttal_resolved: "Rebuttal resolved",
  pending_grade: "Grading...",
};

const TONES: Record<AssignmentStatus, "neutral" | "ok" | "warn" | "error" | "info"> = {
  open: "info",
  submitted: "info",
  graded: "ok",
  late: "warn",
  missed: "error",
  rebuttal_pending: "warn",
  rebuttal_resolved: "ok",
  pending_grade: "warn",
};

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}

export function DueBadge({ dueAt, status }: { dueAt: string; status: AssignmentStatus }) {
  if (status === "graded" || status === "rebuttal_resolved") {
    return <Badge tone="ok">Graded</Badge>;
  }
  if (status === "missed") {
    return <Badge tone="error">Missed</Badge>;
  }

  const h = hoursUntil(dueAt);
  if (h < 0) {
    const late = hoursLate(dueAt);
    if (late >= 72) return <Badge tone="error">Past late window</Badge>;
    return <Badge tone="error">{late}h late</Badge>;
  }
  if (h < 24) return <Badge tone="warn">Due in {h}h</Badge>;
  return <Badge tone="info">Due in {Math.floor(h / 24)}d</Badge>;
}
