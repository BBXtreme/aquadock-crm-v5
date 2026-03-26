"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LogOut, User } from "lucide-react";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          setError(error.message);
        } else if (user) {
          setUser(user);
          setDisplayName(user.user_metadata?.display_name || "");
        } else {
          setError("No user found");
        }
      } catch {
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Profile updated successfully!");
      }
    } catch {
      setMessage("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 lg:p-8">
        <Alert>
          <AlertDescription>No user data available. Please try logging in again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div>
          <p className="text-muted-foreground text-sm">{"Home > Profile"}</p>
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
                  <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder-avatar.jpg"} alt="Profile" />
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
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePicture">Profile Picture</Label>
                  <Input id="profilePicture" type="file" accept="image/*" disabled />
                  <p className="text-muted-foreground text-sm">Upload functionality placeholder</p>
                </div>
                <Button type="submit" className="bg-[#24BACC] text-white hover:bg-[#1da0a8]" disabled={loading}>
                  {loading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
              {message && (
                <Alert className="mt-4">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="destructive" className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
