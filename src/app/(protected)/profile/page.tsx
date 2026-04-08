// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, which displays the user's profile information and allows them to update their display name and manage their account.
// If the user has an admin role, it also displays a user management section where they can view all users, change roles, trigger password resets, and delete users.

import { User } from "lucide-react";
import ProfilForm from "@/components/features/profile/ProfileForm";
import { ProfileSignOutButton } from "@/components/features/profile/ProfileSignOutButton";
import UserManagementCard from "@/components/features/profile/UserManagementCard";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeDisplay } from "@/lib/utils/data-format";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  // Fetch or create profile
  let { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profileData) {
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role: 'user',
        display_name: user.display_name || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating profile:", insertError);
      throw new Error("Failed to create profile");
    }

    profileData = newProfile;
  }

  const displayName = safeDisplay(profileData.display_name || user.display_name);
  const role = profileData.role || "user";
  const email = user.email || "";

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
  if (role === 'admin') {
    const adminSupabase = createAdminClient();
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const { data: profiles } = await adminSupabase.from('profiles').select('*');
    const profilesArray = profiles || [];
    allUsers = authUsers.users.map(u => {
      const profile = profilesArray.find(p => p.id === u.id);
      return {
        id: u.id,
        email: u.email || '',
        display_name: profile?.display_name || u.user_metadata?.display_name || null,
        role: profile?.role || 'user',
        created_at: profile?.created_at || null,
        updated_at: profile?.updated_at || null,
        last_sign_in_at: profile?.last_sign_in_at ?? null,
      };
    });
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-lg text-muted-foreground">Welcome, {displayName}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
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
                    profileData.display_name ??
                    safeDisplay(user.email?.split("@")[0] ?? "", "")
                  }
                  initialAvatarUrl={profileData.avatar_url}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-semibold">{displayName || "No display name"}</p>
                <p className="text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
              <div className="text-center space-y-1 pt-4 border-t border-border/50 w-full">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Created:</span> {profileData.created_at ? new Date(profileData.created_at).toLocaleString() : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Last Updated:</span> {profileData.updated_at ? new Date(profileData.updated_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update Profile Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilForm profile={profileData} />
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSignOutButton />
        </CardContent>
      </Card>

      {/* User Management - ONLY visible to admins */}
      {role === 'admin' && <UserManagementCard allUsers={allUsers} />}
    </div>
  );
}
