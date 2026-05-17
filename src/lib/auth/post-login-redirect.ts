// src/lib/auth/post-login-redirect.ts
// Pure helpers that compute the post-login redirect path. Keeping this isolated
// from Next.js / Supabase makes it trivially unit-testable and reusable from
// route handlers, Server Actions, and the client.

import {
  PARTNER_ALLOWED_ROLES,
  ROLE_LANDING_ORDER,
  ROLE_LANDING_PAGES,
} from "./role-page-access";
import type { UserRole } from "./types";

/** Default destination for authenticated CRM users with no special role. */
export const DEFAULT_LANDING_PATH = "/dashboard";

/** Default destination for authenticated partner users. */
export const PARTNER_LANDING_PATH = "/partner/dashboard";

/**
 * Validate an optional `redirectTo` value. Only relative paths starting with
 * `/` are accepted; everything else (absolute URLs, protocol-relative URLs,
 * `..`, empty strings) is rejected to prevent open redirects.
 */
export function sanitizeRedirectTo(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("..")) {
    return null;
  }
  return trimmed;
}

/**
 * Decide where to send the user after a successful sign-in.
 *
 * Precedence:
 *   1. Honor `redirectTo` if it is safe AND the user is authorized for it
 *      (partner-only routes require partner/admin roles).
 *   2. Otherwise pick the first matching role from `ROLE_LANDING_ORDER`.
 *   3. Otherwise fall back to `/dashboard`.
 */
export function resolvePostLoginRedirect(input: {
  roles: readonly UserRole[];
  redirectTo?: string | null;
}): string {
  const safeRedirect = sanitizeRedirectTo(input.redirectTo ?? null);
  if (safeRedirect !== null) {
    if (safeRedirect.startsWith("/partner")) {
      const allowed = PARTNER_ALLOWED_ROLES.some((role) => input.roles.includes(role));
      if (allowed) {
        return safeRedirect;
      }
    } else {
      return safeRedirect;
    }
  }

  for (const role of ROLE_LANDING_ORDER) {
    if (input.roles.includes(role)) {
      return ROLE_LANDING_PAGES[role];
    }
  }

  return DEFAULT_LANDING_PATH;
}
