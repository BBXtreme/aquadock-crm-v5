/**
 * One-time backfill: companies.user_id / contacts.user_id from created_by
 * for active rows where user_id IS NULL and created_by IS NOT NULL.
 *
 * Requires service role (bypasses RLS). Do not run from the browser.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm backfill:user-id
 *
 * Prefer the SQL file in production when you want a single transactional run:
 *   src/sql/backfill-user-id-from-created-by.sql
 */

import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function supabaseUrl() {
  const fromEnv =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {"companies" | "contacts"} table
 */
async function backfillTable(supabase, table) {
  const pageSize = 200;
  let updated = 0;

  for (;;) {
    const { data: rows, error: selectError } = await supabase
      .from(table)
      .select("id, created_by")
      .is("deleted_at", null)
      .is("user_id", null)
      .not("created_by", "is", null)
      .limit(pageSize);

    if (selectError) {
      throw selectError;
    }
    if (!rows?.length) {
      break;
    }

    const results = await Promise.all(
      rows.map((row) =>
        supabase.from(table).update({ user_id: row.created_by }).eq("id", row.id).is("user_id", null),
      ),
    );

    for (const res of results) {
      if (res.error) {
        throw res.error;
      }
    }

    updated += rows.length;
    console.log(`[${table}] updated batch (+${rows.length}, total ${updated})`);
  }

  return updated;
}

async function countOrphans(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("user_id", null)
    .not("created_by", "is", null);

  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function run() {
  const url = supabaseUrl();
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Backfill user_id from created_by (active rows only)…");

  for (const table of ["companies", "contacts"]) {
    const before = await countOrphans(supabase, table);
    console.log(`[${table}] rows to fix before: ${before}`);
  }

  const companiesUpdated = await backfillTable(supabase, "companies");
  const contactsUpdated = await backfillTable(supabase, "contacts");

  console.log(`Done. companies: ${companiesUpdated} row(s), contacts: ${contactsUpdated} row(s).`);

  for (const table of ["companies", "contacts"]) {
    const after = await countOrphans(supabase, table);
    console.log(`[${table}] rows still matching fix criteria: ${after}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
