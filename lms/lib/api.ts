import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Wrap an authenticated API handler. Verifies session, exposes the supabase
 * client + user, and turns thrown errors into JSON 500s instead of 200/HTML.
 */
export function authedHandler<T>(
  fn: (args: {
    user: { id: string; email?: string };
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    body: T;
  }) => Promise<Response | NextResponse>,
) {
  return async (req: Request) => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    let body: T;
    try {
      body =
        req.headers.get("content-type")?.includes("application/json")
          ? ((await req.json()) as T)
          : ({} as T);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    try {
      return await fn({ user: data.user, supabase, body });
    } catch (err) {
      console.error("API handler error", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Internal error" },
        { status: 500 },
      );
    }
  };
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
