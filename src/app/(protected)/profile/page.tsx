// src/app/(protected)/profile/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Upload, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser-client";
import type { Database } from "@/lib/supabase/database.types";
import { safeDisplay } from "@/lib/utils/data-format";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const displayNameSchema = z.object({
  display_name: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
});

type DisplayNameForm = z.infer<typeof displayNameSchema>;

// Server Action - Update Display Name
export async function updateDisplayName(display_name: string) {
  'use server';
  const supabase = createClient(); // browser client is allowed in server actions in this context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);

  if (error) {
    console.error("Update error:", error);
    throw new Error("Failed to update display name");
  }

  // Revalidate the profile page
  revalidatePath('/profile');
}

// Server Action - Sign Out
export async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Client Form Component
function ProfileForm({ profile }: { profile: Profile }) {
  const form = useForm<DisplayNameForm>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      display_name: profile?.display_name ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: () => {
      toast.success("Display name updated successfully");
      form.reset({ display_name: form.getValues("display_name") });
    },
    onError: () => {
      toast.error("Failed to update display name");
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data.display_name);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Display Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter your display name"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-3">
          <Label htmlFor="profilePicture" className="text-sm font-medium">Profile Picture</Label>
          <Input id="profilePicture" type="file" accept="image/*" disabled className="h-11" />
          <p className="text-muted-foreground text-sm">Upload functionality coming soon</p>
        </div>
        <Button 
          type="submit" 
          className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors" 
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  );
}

// Main Page Component
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          redirect('/login');
          return;
        }

        setUser(authUser);

        // Try to fetch profile
        let { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        // Create profile if it doesn't exist
        if (!profileData) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              id: authUser.id,
              role: 'user',
              display_name: authUser.user_metadata?.display_name || null,
              avatar_url: authUser.user_metadata?.avatar_url || null,
            })
            .select()
            .single();

          profileData = newProfile;
        }

        setProfile(profileData);
      } catch (e) {
        console.error("Profile loading error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return <div className="p-10 text-center">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-10 text-center text-red-500">Failed to load profile</div>;
  }

  const displayName = safeDisplay(profile.display_name || user?.user_metadata?.display_name);
  const role = profile.role || "user";
  const avatarUrl = profile.avatar_url || "";
  const email = user?.email || "";

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-lg text-muted-foreground">Welcome, {displayName}</p>
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

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
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