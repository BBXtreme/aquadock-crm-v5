// This file defines the Profile page of the application, where users can view and update their profile information.
// It displays the user's email, display name, and avatar, and includes a form for updating the display name and profile
// picture (currently disabled as a placeholder).
// The page also includes a section for account actions, such as signing out (also currently disabled).
// The user data is fetched from the authentication context or Supabase client.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth/require-user";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import ProfilePageClient from "./ProfilePageClient";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function updateDisplayName(display_name: string) {
  'use server';
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath('/profile');
}

export async function signOut() {
  'use server';
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return <ProfilePageClient user={user} profile={profile} />;
}
