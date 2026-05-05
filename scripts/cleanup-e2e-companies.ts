// scripts/cleanup-e2e-companies.ts
// Delete companies starting with 'E2E-' from the database to clean up after e2e tests

import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find companies with firmenname starting with 'E2E-'
  const { data: companies, error: selectError } = await supabase
    .from("companies")
    .select("id, firmenname")
    .like("firmenname", "E2E-%");

  if (selectError) {
    throw new Error(`Failed to query companies: ${selectError.message}`);
  }

  if (!companies || companies.length === 0) {
    console.log("No E2E companies found to clean up.");
    return;
  }

  console.log(`Found ${companies.length} E2E companies to delete:`);
  for (const company of companies) {
    console.log(`  - ${company.firmenname} (ID: ${company.id})`);
  }

  // Delete the companies
  const { error: deleteError } = await supabase
    .from("companies")
    .delete()
    .in("id", companies.map(c => c.id));

  if (deleteError) {
    throw new Error(`Failed to delete companies: ${deleteError.message}`);
  }

  console.log(`Successfully deleted ${companies.length} E2E companies.`);
}

main().catch(console.error);