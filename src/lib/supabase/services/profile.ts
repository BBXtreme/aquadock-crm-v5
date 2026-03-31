// src/lib/supabase/services/profile.ts
// This file contains server actions related to user profile management, including updating display names, changing user roles (admin only), triggering password resets (admin only), deleting users (admin only), and signing out.

'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

// Server Action - Update Display Name (for current user)
export async function updateDisplayName(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const display_name = formData.get('display_name') as string;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);

  if (error) {
    console.error("Update display name error:", error);
    throw new Error("Failed to update display name. Please try again.");
  }

  revalidatePath('/profile');
}

// Server Action - Update User Display Name (Admin only)
export async function updateUserDisplayName(formData: FormData) {
  const userSupabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await userSupabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  // Only allow admins
  const { data: adminProfile } = await userSupabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    throw new Error("Only admins can update user display names");
  }

  const userId = formData.get('userId') as string;
  const display_name = formData.get('display_name') as string;

  // Use service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variables");
  }
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await serviceSupabase
    .from("profiles")
    .update({ display_name })
    .eq("id", userId);

  if (error) throw new Error("Failed to update display name");

  revalidatePath('/profile');
}

// Server Action - Change User Role (Admin only)
export async function changeUserRole(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  // Only allow admins to change roles
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    throw new Error("Only admins can change user roles");
  }

  const userId = formData.get('userId') as string;
  const newRole = formData.get('newRole') as 'user' | 'admin';

  // Use service role client to bypass RLS for admin actions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variables");
  }
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await serviceSupabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error("Failed to update user role");

  revalidatePath('/profile');
}

// Server Action - Trigger Password Reset (Admin only)
export async function triggerPasswordReset(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  const userId = formData.get('userId') as string;

  const { data: authUser, error: fetchError } = await supabase.auth.admin.getUserById(userId);
  if (fetchError || !authUser.user?.email) {
    throw new Error("User or email not found");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email);
  if (error) throw new Error("Failed to send password reset email");

  revalidatePath('/profile');
}

// Server Action - Delete User (Admin only)
export async function deleteUser(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  const userId = formData.get('userId') as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variables");
  }
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

  // Delete from profiles table first
  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) throw profileError;

  // Delete from auth.users
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  revalidatePath('/profile');
}

// Server Action - Sign Out
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
