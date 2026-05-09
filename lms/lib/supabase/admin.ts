import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS — call only from API routes with prior
 * authentication, never from a Server Component or anything reachable from
 * the browser.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
