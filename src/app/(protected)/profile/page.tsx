// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, where users can view and update their profile information.
// It displays the user's email, display name, and avatar, and includes a form for updating the display name and profile
// picture (currently disabled as a placeholder).
// The page also includes a section for account actions, such as signing out (also currently disabled).
// The user data is fetched from the authentication context or Supabase client.

import { LogOut, Upload, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { safeDisplay } from "@/lib/utils/data-format";

async function updateProfile(formData: FormData) {
  'use server';
  const user = await requireUser();
  const display_name = formData.get('display_name') as string;

  if (!display_name || display_name.length < 1 || display_name.length > 50) {
    throw new Error("Invalid display name");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("ofiles")
    .update({ display_name })
    .eq("id", user.id);
  if (error) throw error;

  // Redirect to refresh the page
  redirect('/profile');
}

async function signOut() {
  'use server';
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function ProfilePage() {
  const user = await requireUser();

  const supabase = await createServerSupabaseClient();
  const { data: userProfile } = await supabase
    .from("ofiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const displayName = userProfile?.display_name || user.display_name;
  const role = userProfile?.role || user.role;
  const avatarUrl = userProfile?.avatar_url || user.avatar_url;

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-lg text-muted-foreground">Welcome, {safeDisplay(displayName)}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                  <Upload className="h-4 w-4" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-semibold">{displayName || "No display name"}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium">Display Name</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  defaultValue={displayName || ""}
                  placeholder="Enter your display name"
                  className="h-11"
                  required
                  minLength={1}
                  maxLength={50}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="profilePicture" className="text-sm font-medium">Profile Picture</Label>
                <Input id="profilePicture" type="file" accept="image/*" disabled className="h-11" />
                <p className="text-muted-foreground text-sm">Upload functionality coming soon</p>
              </div>
              <Button type="submit" className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors">
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
