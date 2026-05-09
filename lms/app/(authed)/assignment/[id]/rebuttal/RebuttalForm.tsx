"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

const MIN_WORDS = 100;

export function RebuttalForm({ gradeId }: { gradeId: number }) {
  const router = useRouter();
  const [argument, setArgument] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = argument.trim() ? argument.trim().split(/\s+/).length : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (wordCount < MIN_WORDS) {
      setError(`Minimum ${MIN_WORDS} words. Currently ${wordCount}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rebut-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId, argument_md: argument }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rebuttal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <textarea
        value={argument}
        onChange={(e) => setArgument(e.target.value)}
        rows={12}
        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-sm"
        placeholder="State which rubric criterion you believe was misjudged and why. Cite your submission specifically."
      />
      <div className="flex items-center justify-between text-xs text-[color:var(--color-text-dim)]">
        <span>{wordCount} words (min {MIN_WORDS})</span>
      </div>
      {error ? <p className="text-sm text-[color:var(--color-error)]">{error}</p> : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting..." : "Submit rebuttal"}
        </Button>
      </div>
    </form>
  );
}
