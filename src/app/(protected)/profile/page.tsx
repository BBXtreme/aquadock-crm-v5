// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, where users can view and update their profile information.
// It displays the user's email, display name, and avatar, and includes a form for updating the display name and profile
// picture (currently disabled as a placeholder).
// The page also includes a section for account actions, such as signing out (also currently disabled).
// The user data is currently hardcoded for demonstration purposes, but in a real application, it would be fetched
// from the authentication context or Supabase client.

"use client";

import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  // Dummy user data for mockup
  const user = {
    email: "user@example.com",
    user_metadata: {
      display_name: "John Doe",
      avatar_url: "/placeholder-avatar.png",
    },
  };
  const displayName = user.user_metadata?.display_name || "";

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="font-semibold text-3xl tracking-tight">Profile</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder-avatar.png"} alt="Profile" />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{displayName || "No display name"}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePicture">Profile Picture</Label>
                <Input id="profilePicture" type="file" accept="image/*" disabled />
                <p className="text-muted-foreground text-sm">Upload functionality placeholder</p>
              </div>
              <Button type="submit" className="bg-[#24BACC] text-white hover:bg-[#1da0a8]" disabled>
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="flex items-center" disabled>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
