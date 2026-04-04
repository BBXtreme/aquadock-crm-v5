// src/lib/supabase/proxy.ts
// Helper for Next.js 16+ proxy (formerly middleware)
// Refreshes Supabase session and properly sets/updates cookies on every request

import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "./server";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = await createServerSupabaseClient();

  // Important: Refresh session if needed and set new cookies
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.warn("Supabase session refresh error in proxy:", error.message);
  }

  // If we have a session, ensure cookies are properly set on the response
  if (session) {
    // Supabase automatically manages cookies via the server client,
    // but we explicitly refresh them here for reliability in Next.js 16+
    await supabase.auth.getUser(); // triggers cookie refresh if token is near expiry
  }

  // Copy all Supabase auth cookies from request → response
  const authCookies = request.cookies
    .getAll()
    .filter((cookie) =>
      cookie.name.startsWith("sb-") || 
      cookie.name.includes("supabase")
    );

  authCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookie.name.includes("refresh") ? 60 * 60 * 24 * 7 : undefined,
    });
  });

  return response;
}