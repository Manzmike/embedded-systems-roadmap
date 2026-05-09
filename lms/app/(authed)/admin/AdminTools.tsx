"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface AdminToolsProps {
  activePhaseId: number | null;
  activeWeekId: number | null;
}

export function AdminTools({ activePhaseId, activeWeekId }: AdminToolsProps) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(label: string, url: string, body: unknown) {
    setBusy(label);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      setLog((l) => [`[${label}] ${res.status} ${text.slice(0, 200)}`, ...l]);
    } catch (e) {
      setLog((l) => [`[${label}] ${(e as Error).message}`, ...l]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools</CardTitle>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          disabled={!activeWeekId || busy !== null}
          onClick={() =>
            call("generate-reading", "/api/generate-reading", { weekId: activeWeekId })
          }
        >
          {busy === "generate-reading" ? "..." : "Generate reading (active week)"}
        </Button>
        <Button
          variant="secondary"
          disabled={!activeWeekId || busy !== null}
          onClick={() =>
            call("generate-week", "/api/generate-week", {
              weekId: activeWeekId,
              regenerate: false,
            })
          }
        >
          {busy === "generate-week" ? "..." : "Generate week (active)"}
        </Button>
        <Button
          variant="secondary"
          disabled={!activePhaseId || busy !== null}
          onClick={() =>
            call("generate-syllabus", "/api/generate-syllabus", {
              phaseId: activePhaseId,
            })
          }
        >
          {busy === "generate-syllabus" ? "..." : "Generate syllabus (active phase)"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy !== null}
          onClick={() => call("bump-gaps", "/api/bump-gaps", {})}
        >
          {busy === "bump-gaps" ? "..." : "Bump gap weeks"}
        </Button>
      </div>

      {log.length > 0 ? (
        <pre className="mt-4 max-h-64 overflow-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs">
          {log.join("\n")}
        </pre>
      ) : null}
    </Card>
  );
}
