import { createAdminClient } from "@/lib/supabase/admin";
import type { PendingUser } from "@/types/database.types";

/** Row shape consumed by `UserManagementCard`. */
export type AdminDirectoryUser = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
};

export type AdminUserDirectory = {
  allUsers: AdminDirectoryUser[];
  pendingUsers: PendingUser[];
};

/**
 * Loads auth users merged with `profiles` plus pending onboarding rows.
 * Call only after `requireAdmin()` (service role).
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
  const profilesArray = profiles === null || profiles === undefined ? [] : profiles;
  const allUsers: AdminDirectoryUser[] = usersList.map((u) => {
    const profile = profilesArray.find((p) => p.id === u.id);
    const uEmail = u.email;
    const emailStr = uEmail === null || uEmail === undefined ? "" : uEmail;
    const meta = u.user_metadata;
    let metaDisplay: string | null = null;
    if (meta !== null && typeof meta === "object" && "display_name" in meta) {
      const dn = meta.display_name;
      if (typeof dn === "string" && dn !== "") {
        metaDisplay = dn;
      }
    }
    return {
      id: u.id,
      email: emailStr,
      display_name: profile?.display_name ?? metaDisplay,
      role:
        profile?.role === null || profile?.role === undefined
          ? "user"
          : profile.role,
      created_at: profile?.created_at ?? null,
      updated_at: profile?.updated_at ?? null,
      last_sign_in_at: profile?.last_sign_in_at ?? null,
    };
  });

  return { allUsers, pendingUsers };
}
