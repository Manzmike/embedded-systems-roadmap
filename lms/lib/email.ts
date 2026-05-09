/**
 * Resend wrapper. Lazy-imported so the absence of RESEND_API_KEY in dev does
 * not crash imports.
 */
import type { Notification } from "@/lib/supabase/types";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(args: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("Resend not configured; skipping email", args.subject);
    return;
  }
  // dynamic import keeps the SDK out of the bundle when unused
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
}

export function notificationToEmail(n: Notification, baseUrl: string) {
  const link = n.link_url ? `${baseUrl}${n.link_url}` : baseUrl;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.55;">
      <h2 style="margin:0 0 12px 0;">${escapeHtml(n.title)}</h2>
      ${n.body_md ? `<pre style="white-space:pre-wrap;">${escapeHtml(n.body_md)}</pre>` : ""}
      <p><a href="${link}">Open in LMS</a></p>
    </div>
  `;
  return { subject: n.title, html };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
