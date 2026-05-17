import { isUserRole, type UserRole } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PendingUser } from "@/types/database.types";

/** Row shape consumed by `UserManagementCard`. */
export type AdminDirectoryUser = {
  id: string;
  email: string;
  display_name: string | null;
  /** Legacy primary role from `profiles.role` (kept for compatibility). */
  role: UserRole;
  /** Canonical role list from `public.user_roles` for this user. */
  roles: UserRole[];
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
};

export type AdminUserDirectory = {
  allUsers: AdminDirectoryUser[];
  pendingUsers: PendingUser[];
};

/**
 * Loads auth users merged with `profiles` plus the canonical multi-role list
 * from `public.user_roles` and the pending onboarding queue. Call only after
 * `requireAdmin()` (service role).
 */
export async function fetchAdminUserDirectory(): Promise<AdminUserDirectory> {
  const adminSupabase = createAdminClient();
  const { data: pendingRows } = await adminSupabase
    .from("pending_users")
    .select("*")
    .in("status", ["pending_email_confirmation", "pending_review"])
    .order("requested_at", { ascending: false });
  const pendingUsers = pendingRows ?? [];

  const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
  const usersList = authUsers?.users ?? [];

  const { data: profiles } = await adminSupabase.from("profiles").select("*");
  const profilesArray = profiles ?? [];

  const { data: userRolesRows } = await adminSupabase
    .from("user_roles")
    .select("user_id, role");
  const rolesByUser = new Map<string, UserRole[]>();
  for (const row of userRolesRows ?? []) {
    if (!isUserRole(row.role)) continue;
    const existing = rolesByUser.get(row.user_id) ?? [];
    if (!existing.includes(row.role)) {
      existing.push(row.role);
    }
    rolesByUser.set(row.user_id, existing);
  }

  const allUsers: AdminDirectoryUser[] = usersList.map((u) => {
    const profile = profilesArray.find((p) => p.id === u.id);
    const emailStr = u.email ?? "";
    const meta = u.user_metadata;
    let metaDisplay: string | null = null;
    if (meta !== null && typeof meta === "object" && "display_name" in meta) {
      const dn = meta.display_name;
      if (typeof dn === "string" && dn !== "") {
        metaDisplay = dn;
      }
    }
    const primaryRole: UserRole = isUserRole(profile?.role) ? profile.role : "user";
    const rolesFromTable = rolesByUser.get(u.id);
    const roles =
      rolesFromTable !== undefined && rolesFromTable.length > 0
        ? Array.from(new Set(rolesFromTable)).sort()
        : [primaryRole];

    return {
      id: u.id,
      email: emailStr,
      display_name: profile?.display_name ?? metaDisplay,
      role: primaryRole,
      roles,
      created_at: profile?.created_at ?? null,
      updated_at: profile?.updated_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });

  return { allUsers, pendingUsers };
}
