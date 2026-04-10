// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, which displays the user's profile information and allows them to update their display name and manage their account.
// If the user has an admin role, it also displays a user management section where they can view all users, change roles, trigger password resets, and delete users.

import { User } from "lucide-react";
import AdminTrashBinCard from "@/components/features/profile/AdminTrashBinCard";
import ProfileForm from "@/components/features/profile/ProfileForm";
import ProfileSecuritySection from "@/components/features/profile/ProfileSecuritySection";
import { ProfileSignOutButton } from "@/components/features/profile/ProfileSignOutButton";
import UserManagementCard from "@/components/features/profile/UserManagementCard";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeDisplay } from "@/lib/utils/data-format";
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
    const metaName = user.display_name;
    const insertDisplayName =
      metaName === undefined || metaName === null || metaName === ""
        ? null
        : metaName;

    const inserted = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role: "user",
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

  const displayName = safeDisplay(
    profileRow.display_name ?? user.display_name ?? "",
  );
  const role =
    profileRow.role === null || profileRow.role === undefined
      ? "user"
      : profileRow.role;
  const email =
    user.email === null || user.email === undefined ? "" : user.email;

  // Fetch all users for admin only
  let allUsers: {
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    created_at: string | null;
    updated_at: string | null;
    last_sign_in_at: string | null;
  }[] = [];
  if (role === "admin") {
    const adminSupabase = createAdminClient();
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const { data: profiles } = await adminSupabase.from("profiles").select("*");
    const profilesArray = profiles === null || profiles === undefined ? [] : profiles;
    allUsers = authUsers.users.map((u) => {
      const profile = profilesArray.find((p) => p.id === u.id);
      const uEmail = u.email;
      const emailStr =
        uEmail === null || uEmail === undefined ? "" : uEmail;
      const meta = u.user_metadata;
      let metaDisplay: string | null = null;
      if (
        meta !== null &&
        typeof meta === "object" &&
        "display_name" in meta
      ) {
        const dn = meta.display_name;
        if (typeof dn === "string" && dn !== "") {
          metaDisplay = dn;
        }
      }
      return {
        id: u.id,
        email: emailStr,
        display_name:
          profile?.display_name ?? metaDisplay,
        role:
          profile?.role === null || profile?.role === undefined
            ? "user"
            : profile.role,
        created_at: profile?.created_at ?? null,
        updated_at: profile?.updated_at ?? null,
        last_sign_in_at: profile?.last_sign_in_at ?? null,
      };
    });
  }

  const emailLocalPart =
    user.email === null || user.email === undefined
      ? ""
      : (() => {
          const parts = user.email.split("@");
          const first = parts[0];
          return first === undefined ? "" : first;
        })();

return (
  <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
    <section aria-labelledby="profile-page-title" className="space-y-2">
      <h1
        id="profile-page-title"
        className="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-bold text-3xl text-transparent tracking-tight"
      >
        Profile
      </h1>
      <p className="text-lg text-muted-foreground">Welcome, {displayName}</p>
    </section>

    <section aria-labelledby="profile-overview-heading">
      <h2 id="profile-overview-heading" className="sr-only">
        Profile overview and settings
      </h2>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-shadow hover:shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center text-xl">
              <User className="mr-3 h-6 w-6 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-5">
              <div className="w-full max-w-sm">
                <AvatarUpload
                  userId={user.id}
                  displayName={
                    profileRow.display_name === null ||
                    profileRow.display_name === undefined
                      ? safeDisplay(emailLocalPart, "")
                      : profileRow.display_name
                  }
                  initialAvatarUrl={profileRow.avatar_url}
                />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-semibold text-2xl">
                  {displayName === "" ? "No display name" : displayName}
                </p>
                <p className="text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
              <div className="w-full space-y-1 border-border/50 border-t pt-4 text-center">
                <p className="text-muted-foreground text-xs">
                  <span className="font-medium">Created:</span>{" "}
                  {profileRow.created_at === null ||
                  profileRow.created_at === undefined
                    ? "N/A"
                    : new Date(profileRow.created_at).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  <span className="font-medium">Last Updated:</span>{" "}
                  {profileRow.updated_at === null ||
                  profileRow.updated_at === undefined
                    ? "N/A"
                    : new Date(profileRow.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profil bearbeiten — airy shadcn-style settings card */}
        <Card className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="space-y-1.5 border-border/60 border-b px-5 pb-5 sm:px-6">
            <CardTitle className="font-semibold text-lg tracking-tight sm:text-xl">
              Profil bearbeiten
            </CardTitle>
            <CardDescription className="text-pretty text-sm leading-relaxed">
              Anzeigename, Passwort und E-Mail-Adresse selbst anpassen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-5 py-8 sm:px-6">
            <section
              aria-labelledby="profile-display-heading"
              className="rounded-xl border border-border/50 bg-muted/30 p-5 sm:p-6 dark:bg-muted/10"
            >
              <div className="mb-5 space-y-1">
                <h3
                  id="profile-display-heading"
                  className="font-semibold text-base text-foreground tracking-tight"
                >
                  Profil &amp; Anzeigename
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  So erscheint Ihr Name in AquaDock CRM.
                </p>
              </div>
              <ProfileForm profile={profileRow} />
            </section>

            <section
              aria-labelledby="profile-security-heading"
              className="rounded-xl border border-border/50 bg-muted/30 p-5 sm:p-6 dark:bg-muted/10"
            >
              <div className="mb-5 space-y-1">
                <h3
                  id="profile-security-heading"
                  className="font-semibold text-base text-foreground tracking-tight"
                >
                  Sicherheit
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Passwort ändern, solange Sie angemeldet sind, oder eine neue
                  Anmelde-E-Mail anfordern.
                </p>
              </div>
              <ProfileSecuritySection currentEmail={email} />
            </section>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* Account Actions */}
    <section aria-labelledby="profile-account-actions">
      <h2 id="profile-account-actions" className="sr-only">
        Account actions
      </h2>
      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSignOutButton />
        </CardContent>
      </Card>
    </section>

    {role === "admin" ? (
      <section aria-labelledby="profile-admin-heading" className="space-y-8">
        <h2 id="profile-admin-heading" className="sr-only">
          Administration
        </h2>
        <UserManagementCard allUsers={allUsers} />
        <AdminTrashBinCard />
      </section>
    ) : null}
  </div>
);
}
