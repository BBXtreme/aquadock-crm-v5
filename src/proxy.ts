// src/proxy.ts
// Proxy (formerly middleware) – handles authentication and route protection for AquaDock CRM v5

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/proxy";
import { createServerSupabaseClient } from "./lib/supabase/server";

export async function proxy(request: NextRequest) {
  // === STEP 1: Refresh session & cookies (Supabase + Next.js 16 best practice) ===
  const response = await updateSession(request);

  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Protected paths (URLs stay clean thanks to route groups)
  const protectedPaths = [
    "/dashboard",
    "/companies",
    "/contacts",
    "/timeline",
    "/reminders",
    "/mass-email",
    "/openmap",
    "/settings",
    "/profile",
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;   // Return the response with updated cookies
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};