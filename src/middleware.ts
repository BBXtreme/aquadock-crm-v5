// src/middleware.ts
// This middleware function checks if the user is authenticated when trying to access protected routes. If the user is not authenticated and tries to access a protected route, they are redirected to the login page. If the user is already authenticated and tries to access the login page, they are redirected to the dashboard. The middleware uses the Supabase client to check for an active session and defines a list of protected paths that require authentication.

import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "./lib/supabase/server-client";

export async function middleware(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

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

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if already logged in and trying to access login
  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-*.png).*)",
  ],
};