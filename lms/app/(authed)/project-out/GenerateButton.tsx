"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function GenerateProjectOutButton({ phaseId }: { phaseId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!confirm("Generate the project-out capstone for this phase?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/project-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      const json = await res.json();
      router.push(`/assignment/${json.assignmentId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button onClick={go} disabled={busy}>
        {busy ? "Generating..." : "Generate project-out capstone"}
      </Button>
      {error ? <p className="mt-2 text-sm text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
