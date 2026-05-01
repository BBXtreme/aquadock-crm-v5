// src/proxy.ts
// Proxy (formerly middleware) – handles authentication and route protection for AquaDock CRM v5

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

const PROTECTED_PATHS = [
  "/dashboard",
  "/companies",
  "/contacts",
  "/timeline",
  "/reminders",
  "/mass-email",
  "/openmap",
  "/brevo",
  "/settings",
  "/profile",
  "/notifications",
] as const;

export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);

  // Defense-in-depth: matcher already restricts to protected prefixes; this guard
  // ensures a future matcher tweak cannot silently bypass auth on a public route.
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !hasSession) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/companies/:path*",
    "/contacts/:path*",
    "/timeline/:path*",
    "/reminders/:path*",
    "/mass-email/:path*",
    "/openmap/:path*",
    "/brevo/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};
