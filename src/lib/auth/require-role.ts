// src/lib/auth/require-role.ts
// Generic role gate. Redirects unauthenticated visitors to /login and
// authenticated users without any of the required roles to /unauthorized.
//
// Usage:
//   const user = await requireRole(["partner"]);
//   const user = await requireRole(["partner", "admin"]); // any of

import { redirect } from "next/navigation";
import { requireUser } from "./require-user";
import { type AuthUser, hasAnyRole, type UserRole } from "./types";

export async function requireRole(
  roles: readonly UserRole[],
): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasAnyRole(user, roles)) {
    redirect("/unauthorized");
  }
  return user;
}
