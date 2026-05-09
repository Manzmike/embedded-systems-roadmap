"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { KinesisStatus } from "@/lib/supabase/types";

interface KinesisActionsProps {
  milestoneId: number;
  status: KinesisStatus;
  hardwareConfirmed: boolean;
  completionChecklistMd: string;
}

function parseChecklist(md: string): string[] {
  const lines = md.split("\n");
  const items: string[] = [];
  for (const ln of lines) {
    const m = ln.match(/^- \[ ?\] (.+)$/);
    if (m) items.push(m[1]);
  }
  return items;
}

export function KinesisActions({
  milestoneId,
  status,
  hardwareConfirmed,
  completionChecklistMd,
}: KinesisActionsProps) {
  const router = useRouter();
  const [hwOk, setHwOk] = useState(hardwareConfirmed);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(
    () => parseChecklist(completionChecklistMd),
    [completionChecklistMd],
  );

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/start-kinesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, hardwareConfirmed: hwOk }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/complete-kinesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, completionChecklist: checked }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "locked") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locked</CardTitle>
        </CardHeader>
        <p className="text-sm text-[color:var(--color-text-dim)]">
          Complete the preceding phase mastery gate to unlock this milestone.
        </p>
      </Card>
    );
  }

  if (status === "available") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start milestone</CardTitle>
        </CardHeader>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={hwOk}
            onChange={(e) => setHwOk(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I have the required hardware on hand to start this milestone.
          </span>
        </label>
        {error ? (
          <p className="mt-2 text-sm text-[color:var(--color-error)]">{error}</p>
        ) : null}
        <div className="mt-3">
          <Button onClick={start} disabled={!hwOk || busy}>
            {busy ? "Starting..." : "Mark started"}
          </Button>
        </div>
      </Card>
    );
  }

  if (status === "in_progress") {
    const allChecked =
      checklist.length > 0 && checklist.every((item) => checked[item]);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit for review</CardTitle>
        </CardHeader>
        <ul className="flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!checked[item]}
                  onChange={(e) =>
                    setChecked((c) => ({ ...c, [item]: e.target.checked }))
                  }
                  className="mt-1"
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="mt-2 text-sm text-[color:var(--color-error)]">{error}</p>
        ) : null}
        <div className="mt-3">
          <Button onClick={complete} disabled={!allChecked || busy}>
            {busy ? "Submitting..." : "Submit for review"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completed</CardTitle>
      </CardHeader>
      <p className="text-sm text-[color:var(--color-text-dim)]">
        Milestone is complete. The next phase is unlocked.
      </p>
    </Card>
  );
}
