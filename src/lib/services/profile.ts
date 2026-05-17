// src/lib/services/profile.ts
// This file contains server actions related to user profile management, including updating display names, changing user roles (admin only), triggering password resets (admin only), deleting users (admin only), and signing out.

'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROLE_LANDING_ORDER } from "@/lib/auth/role-page-access";
import type { UserRole } from "@/lib/auth/types";
import { revalidateAdminUserManagement } from "@/lib/next-cache/revalidate-admin-user-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthRedirectUrl } from "@/lib/utils/auth-recovery-redirect";
import {
  adminChangeUserRoleSchema,
  adminCreateUserSchema,
  adminDeleteUserSchema,
  adminSetUserRolesSchema,
  adminUpdateUserDisplayNameSchema,
  profileDisplayNameSchema,
  userRolesFromFormDataSchema,
} from "@/lib/validations/profile";

type AdminSupabase = ReturnType<typeof createAdminClient>;

async function assertAdminAccess(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  errorMessage: string,
): Promise<void> {
  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError !== null) {
    throw new Error(`Failed to verify admin role: ${roleError.message}`);
  }
  if (adminRole?.role === "admin") {
    return;
  }

  // Legacy fallback while `profiles.role` is still present during migration.
  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError !== null) {
    throw new Error(`Failed to verify admin profile: ${profileError.message}`);
  }
  if (adminProfile.role !== "admin") {
    throw new Error(errorMessage);
  }
}

/**
 * Replace the canonical role set for a user. Synchronises `public.user_roles`
 * (insert missing rows, delete extras) AND keeps the legacy `profiles.role`
 * field in sync by storing the highest-priority role from `ROLE_LANDING_ORDER`.
 */
async function syncUserRoles(
  supabase: AdminSupabase,
  userId: string,
  roles: readonly UserRole[],
): Promise<void> {
  const uniqueRoles = Array.from(new Set(roles));

  const { data: existingRows, error: fetchError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (fetchError !== null) {
    throw new Error(`Failed to read existing roles: ${fetchError.message}`);
  }
  const existing = new Set<string>((existingRows ?? []).map((row) => row.role));

  const toInsert = uniqueRoles.filter((role) => !existing.has(role));
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert(toInsert.map((role) => ({ user_id: userId, role })));
    if (insertError !== null) {
      throw new Error(`Failed to add roles: ${insertError.message}`);
    }
  }

  const toDelete = Array.from(existing).filter(
    (role) => !uniqueRoles.includes(role as UserRole),
  );
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", toDelete);
    if (deleteError !== null) {
      throw new Error(`Failed to remove roles: ${deleteError.message}`);
    }
  }

  const primaryRole =
    ROLE_LANDING_ORDER.find((role) => uniqueRoles.includes(role)) ??
    uniqueRoles[0] ??
    "user";

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: primaryRole })
    .eq("id", userId);
  if (profileError !== null) {
    throw new Error(
      `Failed to sync legacy profile role: ${profileError.message}`,
    );
  }
}

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

  await assertAdminAccess(
    userSupabase,
    currentUser.id,
    "Only admins can update user display names",
  );

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

// Server Action - Change User Role (Admin only). Legacy single-role entry
// point; internally sets the user to exactly `[newRole]` via syncUserRoles().
export async function changeUserRole(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  await assertAdminAccess(
    supabase,
    currentUser.id,
    "Only admins can change user roles",
  );

  const { userId, newRole } = adminChangeUserRoleSchema.parse({
    userId: formData.get("userId"),
    newRole: formData.get("newRole"),
  });

  const serviceSupabase = createAdminClient();
  await syncUserRoles(serviceSupabase, userId, [newRole]);

  revalidateAdminUserManagement();
}

// Server Action - Set the canonical role list for a user (Admin only).
export async function setUserRoles(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Not authenticated");

  await assertAdminAccess(
    supabase,
    currentUser.id,
    "Only admins can change user roles",
  );

  const parsedRoles = userRolesFromFormDataSchema.parse(formData.get("roles"));
  const { userId, roles } = adminSetUserRolesSchema.parse({
    userId: formData.get("userId"),
    roles: parsedRoles,
  });

  if (userId === currentUser.id && !roles.includes("admin")) {
    throw new Error(
      "Du kannst Dir nicht selbst die Admin-Rolle entziehen.",
    );
  }

  const serviceSupabase = createAdminClient();
  await syncUserRoles(serviceSupabase, userId, roles);

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

  await assertAdminAccess(
    supabase,
    currentUser.id,
    "Only admins can trigger password resets",
  );

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

  await assertAdminAccess(supabase, currentUser.id, "Only admins can delete users");

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

  await assertAdminAccess(supabase, currentUser.id, "Only admins can create users");

  const parsedRoles = userRolesFromFormDataSchema.parse(formData.get("roles"));
  const { email, display_name, roles } = adminCreateUserSchema.parse({
    email: String(formData.get("email") ?? ""),
    display_name: String(formData.get("display_name") ?? ""),
    roles: parsedRoles,
  });

  const primaryRole =
    ROLE_LANDING_ORDER.find((role) => roles.includes(role)) ?? roles[0];

  const crypto = await import('node:crypto');
  const randomPassword = crypto.randomBytes(16).toString('hex');

  const serviceSupabase = createAdminClient();

  console.log("Creating auth user for:", email);
  const { data, error } = await serviceSupabase.auth.admin.createUser({
    email,
    password: randomPassword,
    user_metadata: { display_name: display_name ?? "" },
    email_confirm: true,
  });

  if (error) {
    console.error("Auth user creation error:", error);
    throw new Error(`Failed to create auth user for ${email}: ${error.message}`);
  }

  console.log("Auth user created successfully:", data.user.id);

  const profileData = {
    id: data.user.id,
    role: primaryRole,
    display_name,
  };

  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .upsert(profileData);

  if (profileError) {
    console.error("Profile upsert error:", profileError);
    throw new Error(`Failed to create profile for user ${email}: ${profileError.message}`);
  }

  await syncUserRoles(serviceSupabase, data.user.id, roles);

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
