// src/middleware.ts
// This middleware handles authentication and route protection for the 
// application. It checks if a user is authenticated when accessing 
// protected routes and redirects them to the login page if they are not. It also prevents authenticated users from accessing the login page by redirecting them to the dashboard.

import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "./lib/supabase/server-client";

export async function middleware(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Protected paths (URLs remain the same even with route groups)
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

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo-*.png (public assets)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo-.*\\.png).*)",
  ],
};