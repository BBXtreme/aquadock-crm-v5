// src/lib/auth/require-admin.ts
// Authenticated + admin role gate. Multi-role aware: checks `roles.includes("admin")`
// (canonical), with legacy `role === "admin"` already represented via `roles`
// thanks to `get-crm-user-context.ts`.

import { redirect } from "next/navigation";
import { requireUser } from "./require-user";
import { hasRole } from "./types";

export async function requireAdmin() {
  const user = await requireUser();

  if (!hasRole(user, "admin")) {
    redirect("/unauthorized");
  }

  return user;
}
