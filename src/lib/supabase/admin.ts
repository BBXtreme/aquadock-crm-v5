import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role permissions for admin operations.
 * This client bypasses Row Level Security (RLS) and should be used carefully.
 *
 * @returns A Supabase client instance with service role key
 * @throws Error if required environment variables are missing
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
