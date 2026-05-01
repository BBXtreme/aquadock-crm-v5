// src/app/(protected)/profile/page.tsx
// Profile page: identity (avatar, display context), account security (email/password),
// and sign-out. Admin tooling lives under /admin/*.

import { redirect } from "next/navigation";
import { ProfilePageView } from "@/components/features/profile/ProfilePageView";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  let profileData: Profile | null = null;
  const profileQuery = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileQuery.error === null && profileQuery.data !== null) {
    profileData = profileQuery.data;
  }

  if (profileData === null) {
    const adminForPending = createAdminClient();
    const { data: pend } = await adminForPending
      .from("pending_users")
      .select("status, chosen_role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (pend !== null && pend.status !== "accepted") {
      redirect("/access-pending");
    }

    const insertRole: "user" | "admin" =
      pend !== null &&
      pend.status === "accepted" &&
      pend.chosen_role !== null &&
      pend.chosen_role !== ""
        ? pend.chosen_role === "admin"
          ? "admin"
          : "user"
        : "user";

    const metaName = user.display_name;
    const insertDisplayName =
      metaName === undefined || metaName === null || metaName === ""
        ? null
        : metaName;

    const inserted = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role: insertRole,
        display_name: insertDisplayName,
      })
      .select()
      .single();

    if (inserted.error !== null || inserted.data === null) {
      console.error("Error creating profile:", inserted.error);
      throw new Error("Failed to create profile");
    }
    profileData = inserted.data;
  }

  if (profileData === null) {
    throw new Error("Failed to load profile");
  }

  const profileRow = profileData;

  return (
    <PageShell>
      <ProfilePageView profileRow={profileRow} user={user} />
    </PageShell>
  );
}
