"use client";

import { useState } from "react";

import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";

interface WeekTabsProps {
  reading: string | null;
  tutorial: string | null;
  problem: string | null;
  notebooklm: string | null;
}

const TABS = [
  { key: "reading", label: "Reading" },
  { key: "tutorial", label: "Tutorial" },
  { key: "problem", label: "Problem" },
  { key: "notebooklm", label: "NotebookLM" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function WeekTabs(props: WeekTabsProps) {
  const [active, setActive] = useState<TabKey>("reading");
  const source =
    active === "reading"
      ? props.reading
      : active === "tutorial"
        ? props.tutorial
        : active === "problem"
          ? props.problem
          : props.notebooklm;
  return (
    <div>
      <div className="flex gap-1 border-b border-[color:var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm",
              active === t.key
                ? "bg-[color:var(--color-surface)] font-medium"
                : "text-[color:var(--color-text-dim)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-b-md border border-t-0 border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <Markdown source={source} />
      </div>
    </div>
  );
}
