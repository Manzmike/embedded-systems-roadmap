import { NextResponse } from "next/server";

import { authedHandler } from "@/lib/api";

export const POST = authedHandler(async ({ supabase }) => {
  await supabase.rpc("bump_persisting_gaps");
  return NextResponse.json({ ok: true });
});
