/**
 * Cron handler for emailing unsent notifications. Wire up via Vercel Cron:
 *   { "path": "/api/cron/email-notifications", "schedule": "*\/15 * * * *" }
 *
 * Uses the service-role client (admin) and processes all users — there's only
 * one, but this is the right shape if the LMS ever supports more.
 */
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notificationToEmail, sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  // optional cron auth — Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const userEmail = process.env.USER_EMAIL;
  if (!userEmail) {
    return NextResponse.json({ skipped: "USER_EMAIL not set" });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get("host") ?? ""}`;

  const admin = createSupabaseAdminClient();
  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .is("emailed_at", null)
    .order("created_at")
    .limit(20);

  let sent = 0;
  for (const n of notifications ?? []) {
    const { subject, html } = notificationToEmail(n, baseUrl);
    try {
      await sendEmail({ to: userEmail, subject, html });
      await admin
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", n.id);
      sent++;
    } catch (err) {
      console.error("Email send failed", n.id, err);
    }
  }

  return NextResponse.json({ sent, total: notifications?.length ?? 0 });
}
