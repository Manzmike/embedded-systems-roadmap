import { NextResponse } from "next/server";
import { z } from "zod";

import { authedHandler, badRequest } from "@/lib/api";
import { gradeSubmission } from "@/lib/grading";

const Body = z.object({ submissionId: z.number().int().positive() });

export const POST = authedHandler(async ({ user, supabase, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("submissionId required");
  const grade = await gradeSubmission({
    supabase,
    userId: user.id,
    submissionId: parsed.data.submissionId,
  });
  return NextResponse.json({ ok: true, gradeId: grade.id });
});
