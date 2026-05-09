"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import type { AssignmentKind } from "@/lib/supabase/types";

interface SubmissionFormProps {
  assignmentId: number;
  kind: AssignmentKind;
}

const CODE_KINDS: AssignmentKind[] = [
  "mini_problem",
  "main_project",
  "kinesis_project",
  "project_out",
  "remediation",
];

const TEXT_KINDS: AssignmentKind[] = [
  "weekly_report",
  "discussion_post",
  "tutorial_completion",
  "kinesis_report",
];

export function SubmissionForm({ assignmentId, kind }: SubmissionFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("c");
  const [filename, setFilename] = useState("");
  const [github, setGithub] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wantsText = TEXT_KINDS.includes(kind);
  const wantsCode = CODE_KINDS.includes(kind);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/submit-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          content_md: wantsText ? content : null,
          code: wantsCode ? code : null,
          language: wantsCode ? language : null,
          filename: wantsCode ? filename || null : null,
          github_url: github || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {wantsText ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--color-text-dim)]">
            Submission (markdown)
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-sm"
            placeholder="Write directly here. Markdown formatting supported."
          />
          <span className="text-xs text-[color:var(--color-text-dim)]">
            {wordCount} words
          </span>
        </label>
      ) : null}

      {wantsCode ? (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--color-text-dim)]">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-2"
              >
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="swift">Swift</option>
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-[color:var(--color-text-dim)]">Filename (optional)</span>
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="ring_buffer.c"
                className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--color-text-dim)]">Code</span>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={18}
              className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-sm"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[color:var(--color-text-dim)]">
              Optional: write-up / report (markdown)
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-sm"
              placeholder="Evaluation answers, design notes, tradeoffs..."
            />
          </label>
        </>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[color:var(--color-text-dim)]">
          GitHub URL (optional)
        </span>
        <input
          value={github}
          onChange={(e) => setGithub(e.target.value)}
          placeholder="https://github.com/..."
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
        />
      </label>

      {error ? (
        <p className="text-sm text-[color:var(--color-error)]">{error}</p>
      ) : null}

      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
