import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { handleSupabaseError } from "./utils";

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
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const key =
    process.env.NODE_ENV === "development" && supabaseServiceRoleKey
      ? supabaseServiceRoleKey
      : supabaseAnonKey;

  if (!key) {
    throw new Error("Supabase key is missing");
  }

  return createServerClient(supabaseUrl, key, {
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