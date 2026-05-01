// src/lib/services/profile.ts
// This file contains server actions related to user profile management, including updating display names, changing user roles (admin only), triggering password resets (admin only), deleting users (admin only), and signing out.

'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidateAdminUserManagement } from "@/lib/next-cache/revalidate-admin-user-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthRedirectUrl } from "@/lib/utils/auth-recovery-redirect";
import {
  adminChangeUserRoleSchema,
  adminCreateUserSchema,
  adminDeleteUserSchema,
  adminUpdateUserDisplayNameSchema,
  profileDisplayNameSchema,
} from "@/lib/validations/profile";

// Server Action - Update Display Name (for current user)
export async function updateDisplayName(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { display_name } = profileDisplayNameSchema.parse({
    display_name: String(formData.get("display_name") ?? ""),
  });

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

  const { userId, display_name } = adminUpdateUserDisplayNameSchema.parse({
    userId: formData.get("userId"),
    display_name: String(formData.get("display_name") ?? ""),
  });

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

  revalidateAdminUserManagement();
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

  const { userId, newRole } = adminChangeUserRoleSchema.parse({
    userId: formData.get("userId"),
    newRole: formData.get("newRole"),
  });

  // Use service role client to bypass RLS for admin actions
  const serviceSupabase = createAdminClient();

  const { error } = await serviceSupabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error("Failed to update user role");

  revalidateAdminUserManagement();
}

export type TriggerPasswordResetResult = {
  /** Same URL passed to GoTrue (`redirectTo`); from env, request host, or Vercel. */
  redirectTo: string;
};

/**
 * Admin-only: sends Supabase recovery email with `redirectTo` from
 * `resolveAuthRecoveryRedirectUrl()` (localhost http vs Vercel https).
 */
export async function triggerPasswordReset(
  userId: string,
): Promise<TriggerPasswordResetResult> {
  const id = z.string().uuid().parse(userId);
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== "admin") {
    throw new Error("Only admins can trigger password resets");
  }

  const adminClient = createAdminClient();

  const { data: authUser, error: fetchError } =
    await adminClient.auth.admin.getUserById(id);

  if (fetchError !== null) {
    throw new Error("User or email not found");
  }

  if (authUser.user === undefined) {
    throw new Error("User or email not found");
  }

  const email = authUser.user.email;
  if (email === undefined || email === null || email === "") {
    throw new Error("User or email not found");
  }

  const redirectTo = await resolveAuthRedirectUrl("/login");

  const { error } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    if (error.status === 429) {
      throw new Error("RESET_EMAIL_RATE_LIMITED");
    }
    throw new Error("Failed to send password reset email");
  }

  revalidateAdminUserManagement();

  return { redirectTo };
}

// Server Action - Delete User (Admin only)
export async function deleteUser(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== "admin") {
    throw new Error("Only admins can delete users");
  }

  const { userId } = adminDeleteUserSchema.parse({ userId: formData.get("userId") });

  const serviceSupabase = createAdminClient();

  // Delete from profiles table first
  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) throw profileError;

  // Delete from auth.users (service role — user-scoped client cannot call auth.admin)
  const { error: authError } =
    await serviceSupabase.auth.admin.deleteUser(userId);

  if (authError) throw authError;

  revalidateAdminUserManagement();
}

// Server Action - Create New User (Admin only)
export async function createUser(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  // Only allow admins
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    throw new Error("Only admins can create users");
  }

  const { email, display_name, role } = adminCreateUserSchema.parse({
    email: String(formData.get("email") ?? ""),
    display_name: String(formData.get("display_name") ?? ""),
    role: formData.get("role"),
  });

  // Generate random password
  const crypto = await import('node:crypto');
  const randomPassword = crypto.randomBytes(16).toString('hex');

  // Use service role client for all admin operations to ensure consistency and bypass RLS
  const serviceSupabase = createAdminClient();

  // Step 1: Create the auth user
  console.log("Creating auth user for:", email);
  const { data, error } = await serviceSupabase.auth.admin.createUser({
    email,
    password: randomPassword,
    user_metadata: { display_name: display_name ?? "" },
    email_confirm: true, // Automatically confirm email for smoother admin-created users
  });

  if (error) {
    console.error("Auth user creation error:", error);
    throw new Error(`Failed to create auth user for ${email}: ${error.message}`);
  }

  console.log("Auth user created successfully:", data.user.id);

  // Step 2: Create or update the profile
  const profileData = {
    id: data.user.id,
    role,
    display_name,
  };

  console.log("Upserting profile:", profileData);

  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .upsert(profileData);

  if (profileError) {
    console.error("Profile upsert error:", profileError);
    throw new Error(`Failed to create profile for user ${email}: ${profileError.message}`);
  }

  console.log("Profile upserted successfully");

  // Step 3: Send password reset email (redirect must match Supabase allow list + env site URL)
  const { error: resetError } = await serviceSupabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: await resolveAuthRedirectUrl("/set-password") },
  );
  if (resetError) {
    console.error("Failed to send reset email:", resetError);
    // Don't throw, user is created
  } else {
    console.log("Password reset email sent successfully");
  }

  revalidateAdminUserManagement();
}

// Server Action - Sign Out
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
