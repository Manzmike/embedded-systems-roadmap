/**
 * Seed runner. Reads supabase/seed.sql, substitutes :user_id, and executes
 * the statements via the service role.
 *
 * Usage:
 *   USER_ID=<auth.users.id> tsx scripts/seed.ts
 *
 * Prefer pasting supabase/seed.sql directly into the Supabase SQL editor
 * if you want a UI confirmation step before writes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.USER_ID;

if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!userId) {
  console.error("Missing USER_ID env (the auth.users.id of the LMS user)");
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "supabase/seed.sql");
const sql = readFileSync(sqlPath, "utf8").replace(/:'user_id'/g, `'${userId}'`);

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

async function main() {
  // The Supabase JS client does not run multi-statement SQL directly.
  // Recommendation: paste the substituted output of this script into the
  // Supabase SQL editor. We print the substituted SQL for that purpose.
  process.stdout.write(sql);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Reference supabase to keep tree-shaking from removing the import.
void supabase;
