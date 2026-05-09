/**
 * Cron handler that creates "due in 24h" / "due in 1h" notifications.
 *
 * Vercel Cron schedule (every 15 minutes):
 *   { "path": "/api/cron/due-soon", "schedule": "*\/15 * * * *" }
 */
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const horizon24 = new Date(now + 24 * 3600_000).toISOString();
  const horizon1 = new Date(now + 1 * 3600_000).toISOString();

  const { data: dueSoon } = await admin
    .from("assignments")
    .select("id, title, due_at, status, user_id")
    .lt("due_at", horizon24)
    .gt("due_at", new Date(now).toISOString())
    .in("status", ["open", "submitted"]);

  let inserted = 0;
  for (const a of dueSoon ?? []) {
    const dueMs = new Date(a.due_at).getTime() - now;
    const hoursLeft = Math.floor(dueMs / 3600_000);
    const kind = a.due_at < horizon1 ? "due_in_1h" : "due_in_24h";

    // de-dupe by checking if a notification with this kind/link already exists
    const link = `/assignment/${a.id}`;
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", a.user_id)
      .eq("kind", kind)
      .eq("link_url", link)
      .limit(1);
    if ((existing ?? []).length > 0) continue;

    await admin.from("notifications").insert({
      kind,
      title: `${a.title} — due in ${hoursLeft}h`,
      body_md: null,
      link_url: link,
      user_id: a.user_id,
    });
    inserted++;
  }

  return NextResponse.json({ inserted, total: dueSoon?.length ?? 0 });
}
