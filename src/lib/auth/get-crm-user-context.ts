// src/lib/auth/get-crm-user-context.ts
// Single round-trip CRM user-context loader: pairs Supabase Auth (getClaims with
// getUser fallback) with the SECURITY DEFINER `public.get_crm_user_context()` RPC
// to return the user's identity, profile, and pending-onboarding status in one
// shot. Both `getCurrentUser()` and `requireCrmAccess()` delegate here so the
// protected layout pays at most one Auth call + one Postgres RPC per request.
//
// The RPC now returns a canonical `roles text[]` payload sourced from
// `public.user_roles`. The legacy `profile_role` field is retained for
// backwards compatibility and used as a fallback when the array is empty.

import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { type AuthUser, isUserRole, type UserRole } from "./types";

export type CrmUserContext = {
  user: AuthUser | null;
  pendingStatus: string | null;
};

type ProfileFields = {
  role: string | null;
  roles: readonly string[];
  display_name: string | null;
  avatar_url: string | null;
};

function toUserMetadata(value: unknown): { display_name?: string } {
  if (value === null || typeof value !== "object") return {};
  const candidate = value as { display_name?: unknown };
  if (typeof candidate.display_name === "string") {
    return { display_name: candidate.display_name };
  }
  return {};
}

function normalizeRoles(
  rawRoles: readonly string[],
  fallbackRole: string | null,
): UserRole[] {
  const seen = new Set<UserRole>();
  for (const candidate of rawRoles) {
    if (isUserRole(candidate)) {
      seen.add(candidate);
    }
  }
  if (seen.size === 0 && isUserRole(fallbackRole)) {
    seen.add(fallbackRole);
  }
  return Array.from(seen);
}

function pickPrimaryRole(
  roles: readonly UserRole[],
  fallbackRole: string | null,
): UserRole {
  if (isUserRole(fallbackRole) && roles.includes(fallbackRole)) {
    return fallbackRole;
  }
  const first = roles[0];
  if (first !== undefined) {
    return first;
  }
  return "user";
}

function buildAuthUser(
  identity: { id: string; email: string | null; userMetadata: { display_name?: string } },
  profile: ProfileFields | null,
): AuthUser {
  const roles = normalizeRoles(profile?.roles ?? [], profile?.role ?? null);
  const role = pickPrimaryRole(roles, profile?.role ?? null);
  return {
    id: identity.id,
    email: identity.email,
    user_metadata: identity.userMetadata,
    role,
    roles,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };
}

/**
 * Returns the full CRM user context (auth identity + profile + pending status).
 *
 * Round-trip budget per request:
 *   - 1 × `getClaims()` (local JWT verify on asymmetric signing keys; falls back
 *     to a single `getUser()` HTTP call on HS256 — see Phase 1.4 doc).
 *   - 1 × `get_crm_user_context()` RPC (LEFT JOINs profiles + pending_users
 *     plus an aggregated read of `public.user_roles`).
 *
 * Cached via React `cache()`: layout, page, and any helpers that re-call this
 * within the same RSC request resolve to a single network round-trip pair.
 */
export const getCrmUserContext = cache(async (): Promise<CrmUserContext> => {
  const supabase = await createServerSupabaseClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsData === null && claimsError === null) {
    return { user: null, pendingStatus: null };
  }

  let identity: { id: string; email: string | null; userMetadata: { display_name?: string } } | null = null;

  if (claimsData !== null && claimsError === null) {
    const claims = claimsData.claims;
    identity = {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      userMetadata: toUserMetadata(claims.user_metadata),
    };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user === null) {
      return { user: null, pendingStatus: null };
    }
    identity = {
      id: user.id,
      email: user.email ?? null,
      userMetadata: toUserMetadata(user.user_metadata),
    };
  }

  const { data: ctxRows, error: ctxError } = await supabase.rpc("get_crm_user_context");
  if (ctxError !== null) {
    console.error("[getCrmUserContext] RPC failed:", ctxError);
    return {
      user: buildAuthUser(identity, null),
      pendingStatus: null,
    };
  }

  const ctx = ctxRows?.[0] ?? null;
  const profile: ProfileFields | null = ctx?.profile_exists
    ? {
        role: ctx.profile_role ?? null,
        roles: ctx.roles ?? [],
        display_name: ctx.display_name ?? null,
        avatar_url: ctx.avatar_url ?? null,
      }
    : null;

  return {
    user: buildAuthUser(identity, profile),
    pendingStatus: ctx?.pending_status ?? null,
  };
});
