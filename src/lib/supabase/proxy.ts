// src/lib/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "strict" | "lax" | "none";
  secure?: boolean;
};

/**
 * Proxy-only Supabase client: reads/writes cookies on this request's `response`.
 * Do not use `cookies()` from next/headers here — parallel RSC requests + refresh
 * must share one cookie sink; copying `request.cookies` onto `response` after refresh
 * can overwrite new tokens and yield intermittent `session: null` (RSC "Load failed").
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  session: Session | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables. Check your .env.local file.");
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Always use the anon key here. The service role must not be used with
  // createServerClient for session cookies: it can break refresh-token handling
  // and cause Set-Cookie churn → RSC payload failures and navigation loops.
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Do not call getUser() here: it hits Supabase on every navigation (~hundreds of ms),
  // may rotate cookies on each response, and duplicates work with requireUser() in RSC.
  // Route protection still uses verified identity via getCurrentUser() in layouts/pages.

  return { response, session };
}