import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-[color:var(--color-surface-2)] text-[color:var(--color-text-dim)]",
  ok: "bg-emerald-900/40 text-emerald-300",
  warn: "bg-amber-900/40 text-amber-200",
  error: "bg-red-900/40 text-red-300",
  info: "bg-sky-900/40 text-sky-200",
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones;
}

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
