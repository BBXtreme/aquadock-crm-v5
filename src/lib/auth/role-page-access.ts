// src/lib/auth/role-page-access.ts
// In-code role → landing page mapping. Designed to be replaceable with a
// `public.role_page_access` table in v5.1 without changing call sites.
//
// Order matters: the FIRST entry in `ROLE_LANDING_ORDER` whose role the user
// has wins. This is how the post-login redirect prefers partner over internal
// dashboards when a user has multiple roles.

import type { UserRole } from "./types";

export const ROLE_LANDING_PAGES: Readonly<Record<UserRole, string>> = {
  partner: "/partner/dashboard",
  admin: "/dashboard",
  user: "/dashboard",
};

/** Priority order for landing-page resolution when the user has multiple roles. */
export const ROLE_LANDING_ORDER: readonly UserRole[] = [
  "partner",
  "admin",
  "user",
] as const;

/** Roles allowed to enter `/partner/*` route segments. */
export const PARTNER_ALLOWED_ROLES: readonly UserRole[] = [
  "partner",
  "admin",
] as const;
