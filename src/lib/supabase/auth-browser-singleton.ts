import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

/**
 * Single shared browser Supabase client for auth flows (`/login`, `/set-password`).
 * Avoids Strict Mode double-init consuming recovery hash tokens.
 */
let authFlowBrowserSupabase: SupabaseClient | null = null;

export function getAuthBrowserSingletonClient(): SupabaseClient {
  const isTestRuntime =
    typeof process !== "undefined" &&
    (process.env.VITEST === "true" || process.env.NODE_ENV === "test");
  if (isTestRuntime) {
    return createClient();
  }
  if (authFlowBrowserSupabase === null) {
    authFlowBrowserSupabase = createClient();
  }
  return authFlowBrowserSupabase;
}
