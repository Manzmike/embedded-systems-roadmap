"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface Question {
  id: string;
  type: string;
  prompt_md: string;
  max_points: number;
  rubric_md: string;
}

interface ExamRunnerProps {
  assignmentId: number;
  questions: Question[];
}

const STORAGE_PREFIX = "lms.exam.";

export function ExamRunner({ assignmentId, questions }: ExamRunnerProps) {
  const router = useRouter();
  const storageKey = STORAGE_PREFIX + assignmentId;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setAnswers(JSON.parse(raw));
      } catch {
        // ignore corrupt cache
      }
    }
  }, [storageKey]);

  useEffect(() => {
    const t = setInterval(() => {
      localStorage.setItem(storageKey, JSON.stringify(answers));
      setSavedAt(new Date());
    }, 30_000);
    return () => clearInterval(t);
  }, [answers, storageKey]);

  const q = questions[idx];
  const allAnswered = questions.every((qq) => (answers[qq.id] ?? "").trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        examAssignmentId: assignmentId,
        answers: questions.map((qq) => ({
          questionId: qq.id,
          answer_md: answers[qq.id] ?? "",
        })),
      };
      const res = await fetch("/api/submit-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      localStorage.removeItem(storageKey);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!q) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Question {idx + 1} of {questions.length}
        </CardTitle>
        <span className="text-xs text-[color:var(--color-text-dim)]">
          {q.type} · {q.max_points} pts{savedAt ? ` · saved ${savedAt.toLocaleTimeString()}` : ""}
        </span>
      </CardHeader>

      <Markdown source={q.prompt_md} />

      <textarea
        value={answers[q.id] ?? ""}
        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
        rows={14}
        className="mt-3 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-sm"
        placeholder="Your answer (markdown / code as appropriate)"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
          >
            Back
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIdx(Math.min(questions.length - 1, idx + 1))}
            disabled={idx === questions.length - 1}
          >
            Next
          </Button>
        </div>
        <Button onClick={submit} disabled={!allAnswered || busy}>
          {busy ? "Submitting..." : `Submit exam (${questions.filter((qq) => (answers[qq.id] ?? "").trim()).length}/${questions.length})`}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[color:var(--color-error)]">{error}</p>
      ) : null}
    </Card>
  );
}
