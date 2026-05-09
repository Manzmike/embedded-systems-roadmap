"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Roadmap LMS</h1>
      <p className="mb-6 text-sm text-[color:var(--color-text-dim)]">
        Sign in to continue.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--color-text-dim)]">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[color:var(--color-text-dim)]">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
          />
        </label>
        {error ? (
          <p className="text-sm text-[color:var(--color-error)]">{error}</p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
