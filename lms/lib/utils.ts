import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = process.env.NEXT_PUBLIC_USER_TZ ?? "America/Los_Angeles";

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hoursUntil(value: string | Date) {
  const target = typeof value === "string" ? new Date(value) : value;
  const ms = target.getTime() - Date.now();
  return Math.floor(ms / 3_600_000);
}

export function hoursLate(due: string | Date) {
  const target = typeof due === "string" ? new Date(due) : due;
  const ms = Date.now() - target.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 3_600_000);
}

/**
 * Late penalty schedule from the spec:
 *   0–24h late  -> -10
 *   24–48h late -> -20
 *   48–72h late -> -30
 *   >72h        -> missed (caller should treat as 0 / missed)
 */
export function latePenalty(hours: number) {
  if (hours <= 0) return 0;
  if (hours < 24) return 10;
  if (hours < 48) return 20;
  if (hours < 72) return 30;
  return 100;
}

export function letterFromNumeric(n: number): string {
  if (n >= 93) return "A";
  if (n >= 90) return "A-";
  if (n >= 87) return "B+";
  if (n >= 83) return "B";
  if (n >= 80) return "B-";
  if (n >= 77) return "C+";
  if (n >= 73) return "C";
  if (n >= 70) return "C-";
  if (n >= 60) return "D";
  return "F";
}
