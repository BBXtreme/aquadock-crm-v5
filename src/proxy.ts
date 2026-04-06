// src/proxy.ts
// Proxy (formerly middleware) – handles authentication and route protection for AquaDock CRM v5

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, session } = await updateSession(request);

  const protectedPaths = [
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
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
