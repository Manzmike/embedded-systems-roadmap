"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function GenerateButtons({ weekId }: { weekId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={busy !== null}
        onClick={() => call("/api/generate-reading", "reading")}
      >
        {busy === "reading" ? "Generating..." : "Generate READING"}
      </Button>
      <Button
        variant="secondary"
        disabled={busy !== null}
        onClick={() => call("/api/generate-week", "week")}
      >
        {busy === "week" ? "Generating..." : "Generate TUTORIAL + PROBLEM"}
      </Button>
      {error ? (
        <span className="text-xs text-[color:var(--color-error)]">{error}</span>
      ) : null}
    </div>
  );
}
