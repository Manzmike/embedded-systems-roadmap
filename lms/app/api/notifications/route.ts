import { NextResponse } from "next/server";

import { authedHandler } from "@/lib/api";

export const GET = authedHandler(async ({ supabase }) => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ notifications: data ?? [] });
});
