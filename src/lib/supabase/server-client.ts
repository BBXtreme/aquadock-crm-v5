// src/lib/supabase/server.ts
// This file sets up the Supabase client for use in server components
// and route handlers
// It uses the createServerClient function from @supabase/ssr, which
// is designed to work in both server and client environments
// The client is configured using environment variables for the URL and
// anon key, which should be defined in a .env.local file for local
// development and in the deployment environment for production
// The createServerSupabaseClient function can be imported and used
// throughout the app to interact with Supabase in server components
// and route handlers, ensuring that the client is properly initialized
// and configured for server use
// The code includes a check to ensure that the necessary environment
// variables are defined, throwing an error if they are missing to
// prevent runtime issues when trying to use the client without proper
// configuration
// The function also handles cookies using Next.js's cookies API,
// allowing for session management and authentication with Supabase
// in server-side contexts

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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const key =
    process.env.NODE_ENV === "development" && supabaseServiceRoleKey ? supabaseServiceRoleKey : supabaseAnonKey;

  if (!key) {
    throw new Error("Supabase key is missing");
  }

  return createServerClient(supabaseUrl as string, key, {
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
