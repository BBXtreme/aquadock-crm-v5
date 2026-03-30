"use client";

// src/app/(protected)/profile/page.tsx
// This file defines the Profile page of the application, where users can view and update their profile information.
// It displays the user's email, display name, and avatar, and includes a form for updating the display name and profile
// picture (currently disabled as a placeholder).
// The page also includes a section for account actions, such as signing out (also currently disabled).
// The user data is currently hardcoded for demonstration purposes, but in a real application, it would be fetched
// from the authentication context or Supabase client.

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Upload, User } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { requireUser } from "@/lib/supabase/auth/require-user";
import { createClient } from "@/lib/supabase/browser-client";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { safeDisplay } from "@/lib/utils/data-format";
import { redirect } from "next/navigation";

const displayNameSchema = z.object({
  display_name: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
});

type DisplayNameForm = z.infer<typeof displayNameSchema>;

async function signOut() {
  'use server';
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function ProfilePage() {
  const user = await requireUser();

  return <ProfilePageClient user={user} />;
}

function ProfilePageClient({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<DisplayNameForm>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      display_name: userProfile?.display_name || user.display_name || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: DisplayNameForm) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: values.display_name })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      router.refresh();
      toast.success("Display name updated successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to update display name", { description: message });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate(data);
  });

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
                <Button type="submit" className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </Form>
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
