'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

// Server Action - Update Display Name
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
    console.error("Update error:", error);
    throw new Error("Failed to update display name");
  }

  // Revalidate the profile page
  revalidatePath('/profile');
}

// Server Action - Change User Role
export async function changeUserRole(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const userId = formData.get('userId') as string;
  const newRole = formData.get('newRole') as 'user' | 'admin';

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw error;

  revalidatePath('/profile');
}

// Server Action - Trigger Password Reset
export async function triggerPasswordReset(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const userId = formData.get('userId') as string;

  const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !authUser.user?.email) throw new Error("User or email not found");

  const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email);
  if (error) throw error;

  revalidatePath('/profile');
}

// Server Action - Delete User
export async function deleteUser(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const userId = formData.get('userId') as string;

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) throw profileError;

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
