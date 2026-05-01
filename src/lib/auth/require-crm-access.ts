// src/lib/auth/require-crm-access.ts
// Enforces CRM access: blocks onboarding applicants and soft-declined users from the protected shell.

import { redirect } from "next/navigation";
import { cache } from "react";

import { getCrmUserContext } from "./get-crm-user-context";
import type { AuthUser } from "./types";

/**
 * Gate for `(protected)` routes: session required, **not** pending approval,
 * **not** declined (soft block).
 *
 * Single round-trip pair: `getClaims()` (or `getUser()` fallback) + one
 * `get_crm_user_context()` RPC. Profile **and** pending-onboarding status are
 * resolved in the same RPC, replacing the earlier
 *   getUser → SELECT pending_users → getCurrentUser → getUser → SELECT profiles
 * chain.
 */
export const requireCrmAccess = cache(async (): Promise<AuthUser> => {
  const { user, pendingStatus } = await getCrmUserContext();

  if (user === null) {
    redirect("/login");
  }

  if (pendingStatus === "pending_email_confirmation" || pendingStatus === "pending_review") {
    redirect("/access-pending");
  }

  if (pendingStatus === "declined") {
    redirect("/access-denied");
  }

  return user;
});
