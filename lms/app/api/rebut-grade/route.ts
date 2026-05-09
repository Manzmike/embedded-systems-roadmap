import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { evaluateRebuttal } from "@/lib/grading";
import { sanitizeUserInput } from "@/lib/sanitize";

const Body = z.object({
  gradeId: z.number().int().positive(),
  argument_md: z.string().min(50, "argument too short"),
});

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);
  const r = await evaluateRebuttal({
    supabase,
    userId: user.id,
    gradeId: parsed.data.gradeId,
    argumentMd: sanitizeUserInput(parsed.data.argument_md),
  });
  return NextResponse.json({ ok: true, rebuttalId: r.id, outcome: r.outcome });
});
