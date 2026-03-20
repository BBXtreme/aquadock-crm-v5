import { createClient } from "@supabase/supabase-js";
import { createServerClient as createServerSupabaseClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client
export function createServerClient() {
  return createServerSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // server does not need auto-refresh
      persistSession: false, // no localStorage on server
    },
  });
}
