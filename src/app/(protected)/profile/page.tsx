// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, which displays the user's profile information and allows them to update their display name and manage their account.
// If the user has an admin role, it also displays a user management section where they can view all users, change roles, trigger password resets, and delete users.

import { LogOut, Upload, User } from "lucide-react";
import ProfilForm from "@/components/features/profile/ProfileForm";
import UserManagementCard from "@/components/features/profile/UserManagementCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { signOut } from "@/lib/supabase/services/profile";
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
  const avatarUrl = profileData.avatar_url || "";
  const email = user.email || "";

  // Fetch all users for admin only
  let allUsers: { id: string; email: string; display_name: string | null; role: string; created_at: string | null; updated_at: string | null }[] = [];
  if (role === 'admin') {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: profiles } = await supabase.from('profiles').select('*');
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
      };
    });
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-primary/10">
                  <AvatarImage src={avatarUrl || "/placeholder-avatar.png"} alt="Profile" />
                  <AvatarFallback className="text-2xl font-semibold">
                    {email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                  <Upload className="h-4 w-4" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-semibold">{displayName || "No display name"}</p>
                <p className="text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
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
          <form action={signOut}>
            <Button variant="destructive" className="flex items-center h-11 px-6" type="submit">
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User Management - ONLY visible to admins */}
      {role === 'admin' && <UserManagementCard allUsers={allUsers} />}
    </div>
  );
}
