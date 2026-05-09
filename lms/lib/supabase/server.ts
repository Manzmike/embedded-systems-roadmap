import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/types";

/**
 * Server-side Supabase client bound to the user's session cookie. Use this in
 * Server Components, Server Actions, and API routes that should obey RLS.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          for (const { name, value, options } of values) {
            cookieStore.set({ name, value, ...options });
          }
        },
      },
    },
  );
}
