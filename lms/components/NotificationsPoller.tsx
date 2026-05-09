"use client";

import { useEffect, useState } from "react";

import type { Notification } from "@/lib/supabase/types";

/**
 * In-app polling fallback. Every 60 seconds, hit /api/notifications and
 * surface any unread items as a small banner. Real-time via Supabase Realtime
 * is also possible — opt in via NEXT_PUBLIC_REALTIME=1 once the channel is
 * configured.
 */
export function NotificationsPoller() {
  const [latest, setLatest] = useState<Notification | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = (await res.json()) as { notifications: Notification[] };
        const unread = json.notifications.find((n) => !n.read_at);
        if (!cancelled) setLatest(unread ?? null);
      } catch {
        // network errors are silent — polling resumes next tick
      }
    }
    tick();
    const interval = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!latest) return null;

  return (
    <a
      href={latest.link_url ?? "#"}
      className="fixed bottom-4 right-4 z-40 max-w-xs rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm shadow-lg no-underline"
    >
      <strong>{latest.title}</strong>
      {latest.body_md ? (
        <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
          {latest.body_md.slice(0, 140)}
        </p>
      ) : null}
    </a>
  );
}
