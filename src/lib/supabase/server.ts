// src/lib/supabase/server.ts
// This file sets up the Supabase client for use in server components
// and route handlers
// It uses the createServerClient function from @supabase/ssr, which

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { handleSupabaseError } from "./db-error-utils";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "strict" | "lax" | "none";
  secure?: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

/**
 * User-scoped server client (cookies + JWT). Always use the anon key so auth
 * refresh and `setAll` stay aligned with middleware (`proxy.ts`). The service
 * role must not be used here — use `src/lib/supabase/admin.ts` when RLS bypass
 * is required for explicit admin jobs.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Safe to ignore in Server Components / Route Handlers
        }
      },
    },
  });
}

export { handleSupabaseError };
