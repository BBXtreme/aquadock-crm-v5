import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  // Use service role key in development to bypass RLS for testing
  const key =
    process.env.NODE_ENV === "development" && supabaseServiceRoleKey ? supabaseServiceRoleKey : supabaseAnonKey;

  return createServerClient(supabaseUrl!, key!, {
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
          // Intentional: setAll called from Server Component is safe.
          // Middleware or session refresh handles cookie conflicts.
          // See: https://supabase.com/docs/guides/auth/server-side/creating-a-client
        }
      },
    },
  });
}

export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);
  if (error && typeof error === "object" && "message" in error) {
    return new Error(`Database error: ${(error as any).message}`);
  }
  return new Error("An unknown database error occurred");
}
