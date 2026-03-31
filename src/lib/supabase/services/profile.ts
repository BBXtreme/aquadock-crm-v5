// src/app/(protected)/profile/actions.ts
'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

// Update current user's display name
export async function updateDisplayName(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const display_name = formData.get('display_name') as string;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);

  if (error) throw new Error("Failed to update display name");

  revalidatePath('/profile');
}

// Change user role (Admin only)
export async function changeUserRole(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

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

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceSupabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error("Failed to update user role");

  revalidatePath('/profile');
}

// Trigger password reset (Admin only)
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

// Delete user (Admin only)
export async function deleteUser(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  const userId = formData.get('userId') as string;

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  revalidatePath('/profile');
}

// Sign Out
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}