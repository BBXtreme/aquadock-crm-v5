// src/lib/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
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
 *
 * Auth strategy (Phase 1.2):
 *   1. `getClaims()` verifies the JWT locally via `jose` — zero Auth-server round trip
 *      on the happy path (covers the vast majority of navigations).
 *   2. If claims are invalid/expired (or the JWKS fetch fails), fall back to `getUser()`,
 *      which drives the refresh-token flow and writes new cookies through `setAll`.
 *   3. We never call `getSession()` here: the proxy only needs a redirect-or-pass
 *      decision, and `getSession()` adds an extra Auth call without new information.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  hasSession: boolean;
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

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  // Happy path: locally-verified JWT present and not expired.
  if (claimsData !== null && claimsError === null) {
    return { response, hasSession: true };
  }

  // No JWT at all (logged-out browser): skip the Auth-server round-trip too.
  if (claimsData === null && claimsError === null) {
    return { response, hasSession: false };
  }

  // Claims invalid/expired or JWKS unreachable → ask Auth, which also refreshes
  // tokens and writes new cookies through `setAll` if the refresh succeeds.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, hasSession: user !== null };
}
