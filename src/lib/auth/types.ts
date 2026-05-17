// src/lib/auth/types.ts
// Multi-role aware auth types. `role` remains the legacy single-role compat
// field; `roles` is the canonical multi-role payload sourced from
// `public.user_roles` via the `get_crm_user_context` RPC.

export const USER_ROLES = ["user", "admin", "partner"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "user" || value === "admin" || value === "partner";
}

export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: {
    display_name?: string;
  };
  /** Legacy primary role kept for backwards compatibility (`profiles.role`). */
  role: UserRole;
  /** Canonical multi-role list from `public.user_roles`. */
  roles: UserRole[];
  display_name: string | null;
  avatar_url: string | null;
}

export function hasRole(user: Pick<AuthUser, "roles">, role: UserRole): boolean {
  return user.roles.includes(role);
}

export function hasAnyRole(
  user: Pick<AuthUser, "roles">,
  roles: readonly UserRole[],
): boolean {
  return roles.some((role) => user.roles.includes(role));
}
