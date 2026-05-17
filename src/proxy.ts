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
  "/admin",
  "/notifications",
  "/changelog",
  "/partner",
] as const;

/**
 * Public sub-paths under otherwise-protected prefixes. The partner sign-in page
 * lives at `/partner/login` and must remain reachable for unauthenticated
 * visitors. Anything else under `/partner/*` (e.g. `/partner/dashboard`)
 * requires a session via the proxy and a `partner` role at the layout level.
 */
const PUBLIC_PATHS = ["/partner/login"] as const;

export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  // Defense-in-depth: matcher already restricts to protected prefixes; this guard
  // ensures a future matcher tweak cannot silently bypass auth on a public route.
  const isProtectedPath =
    !isPublicPath &&
    PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !hasSession) {
    const isPartnerArea = pathname.startsWith("/partner");
    const loginPath = isPartnerArea ? "/partner/login" : "/login";
    const redirectUrl = new URL(loginPath, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
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
    "/admin/:path*",
    "/notifications/:path*",
    "/changelog/:path*",
    "/partner/:path*",
  ],
};
