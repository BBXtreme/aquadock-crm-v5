"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTimelineEntry } from "@/lib/services/timeline";
import {
  getAdminNotificationEmailsFromEnv,
  sendSystemHtmlEmail,
} from "@/lib/services/system-smtp";
import { resolveAuthRedirectUrl, resolveSiteOrigin } from "@/lib/utils/auth-recovery-redirect";
import { safeDisplay } from "@/lib/utils/data-format";

const acceptSchema = z
  .object({
    pendingId: z.string().uuid(),
    chosenRole: z.enum(["user", "admin"]),
  })
  .strict();

const declineSchema = z
  .object({
    pendingId: z.string().uuid(),
    declineReason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    throw new Error("Not authenticated");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    throw new Error("Only admins can perform this action");
  }
  return { supabase, user, adminDisplayName: profile.display_name };
}

/** After browser `signUp`, persist pending row + audit + notify admins. */
export async function registerPendingUserAfterSignup(
  displayName: string | null,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null || user.email === undefined || user.email === "") {
    throw new Error("Not authenticated");
  }
  const email = user.email.toLowerCase();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("pending_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing !== null) {
    return;
  }

  const { error } = await admin.from("pending_users").insert({
    email,
    display_name: displayName,
    auth_user_id: user.id,
    status: "pending_email_confirmation",
  });

  if (error !== null) {
    throw new Error(error.message);
  }

  const title = `[Onboarding] Access requested by ${email}`;
  const dn =
    displayName === null || displayName === ""
      ? ""
      : safeDisplay(displayName, "");
  await createTimelineEntry(
    {
      title,
      activity_type: "other",
      content:
        dn === ""
          ? "Access request (no display name)."
          : `Requested display name: ${dn}.`,
      company_id: null,
      contact_id: null,
      user_id: user.id,
      created_by: null,
      updated_by: null,
      user_name: dn === "" ? null : dn,
    },
    admin,
  );

  const recipients = getAdminNotificationEmailsFromEnv();
  if (recipients.length > 0) {
    try {
      const origin = await resolveSiteOrigin();
      await sendSystemHtmlEmail({
        to: recipients,
        subject: `[AquaDock CRM] New access request: ${email}`,
        html: `<p>A new user requested access: <strong>${email}</strong>.</p><p><a href="${origin}/profile">Review in User Management</a></p>`,
      });
    } catch (e) {
      console.error("[onboarding] admin notify email failed:", e);
    }
  }

  revalidatePath("/profile");
}

/** Call from `/access-pending` to move to pending_review after Supabase confirms email. */
export async function syncPendingEmailConfirmationIfNeeded(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return;
  }
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("pending_users")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (row === null || row.status !== "pending_email_confirmation") {
    return;
  }

  const { data: authData, error: authErr } =
    await admin.auth.admin.getUserById(user.id);
  if (authErr !== null || authData.user === undefined) {
    return;
  }
  const confirmedAt = authData.user.email_confirmed_at;
  if (confirmedAt === undefined || confirmedAt === null || confirmedAt === "") {
    return;
  }

  const { error: updErr } = await admin
    .from("pending_users")
    .update({
      status: "pending_review",
      email_confirmed_at: confirmedAt,
    })
    .eq("id", row.id);

  if (updErr !== null) {
    console.error("[onboarding] sync confirmation failed:", updErr);
    return;
  }

  const email =
    authData.user.email === undefined || authData.user.email === null
      ? ""
      : authData.user.email;
  await createTimelineEntry(
    {
      title: `[Onboarding] Email confirmed for ${email}`,
      activity_type: "other",
      content: "Applicant confirmed their email address; awaiting admin review.",
      company_id: null,
      contact_id: null,
      user_id: user.id,
      created_by: null,
      updated_by: null,
      user_name: null,
    },
    admin,
  );
}

export async function acceptPendingUser(formData: FormData): Promise<void> {
  const parsed = acceptSchema.safeParse({
    pendingId: formData.get("pendingId"),
    chosenRole: formData.get("chosenRole"),
  });
  if (!parsed.success) {
    throw new Error("Invalid input");
  }
  const { pendingId, chosenRole } = parsed.data;
  const { user, adminDisplayName } = await requireAdmin();
  const admin = createAdminClient();

  const { data: pending, error: fetchErr } = await admin
    .from("pending_users")
    .select("*")
    .eq("id", pendingId)
    .single();

  if (fetchErr !== null || pending === null) {
    throw new Error("Request not found");
  }

  if (pending.status !== "pending_review") {
    throw new Error("Request is not awaiting review");
  }

  const displayName =
    pending.display_name === null || pending.display_name === ""
      ? null
      : pending.display_name;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: pending.auth_user_id,
    role: chosenRole,
    display_name: displayName,
  });

  if (profileErr !== null) {
    throw new Error(profileErr.message);
  }

  const actorName = safeDisplay(adminDisplayName ?? user.email ?? "Admin");

  const { error: pendErr } = await admin
    .from("pending_users")
    .update({
      status: "accepted",
      chosen_role: chosenRole,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", pendingId);

  if (pendErr !== null) {
    throw new Error(pendErr.message);
  }

  const email = pending.email;
  const redirectTo = await resolveAuthRedirectUrl("/set-password");
  const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetErr !== null) {
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
    const actionLink = linkData.properties?.action_link;
    if (linkErr !== null || actionLink === undefined || actionLink === "") {
      console.error("[onboarding] recovery email failed:", resetErr, linkErr);
    } else {
      try {
        await sendSystemHtmlEmail({
          to: [email],
          subject: "[AquaDock CRM] Set your password",
          html: `<p>Your access was approved. <a href="${actionLink}">Set your password</a> to continue.</p>`,
        });
      } catch (e) {
        console.error("[onboarding] fallback recovery mail failed:", e);
      }
    }
  }

  await createTimelineEntry(
    {
      title: `[Onboarding] Access accepted for ${email} (${chosenRole})`,
      activity_type: "other",
      content: `Approved by ${actorName}.`,
      company_id: null,
      contact_id: null,
      user_id: pending.auth_user_id,
      created_by: user.id,
      updated_by: user.id,
      user_name: actorName,
    },
    admin,
  );

  revalidatePath("/profile");
}

/** Soft block: mark declined only — do not delete `auth.users`. */
export async function declinePendingUser(formData: FormData): Promise<void> {
  const rawReason = formData.get("declineReason");
  const parsed = declineSchema.safeParse({
    pendingId: formData.get("pendingId"),
    declineReason:
      rawReason === null || rawReason === ""
        ? null
        : String(rawReason),
  });
  if (!parsed.success) {
    throw new Error("Invalid input");
  }
  const { pendingId, declineReason } = parsed.data;
  const { user, adminDisplayName } = await requireAdmin();
  const admin = createAdminClient();

  const { data: pending, error: fetchErr } = await admin
    .from("pending_users")
    .select("*")
    .eq("id", pendingId)
    .single();

  if (fetchErr !== null || pending === null) {
    throw new Error("Request not found");
  }

  if (pending.status !== "pending_review") {
    throw new Error("Request is not awaiting review");
  }

  const actorName = safeDisplay(adminDisplayName ?? user.email ?? "Admin");

  const { error: updErr } = await admin
    .from("pending_users")
    .update({
      status: "declined",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      decline_reason: declineReason,
    })
    .eq("id", pendingId);

  if (updErr !== null) {
    throw new Error(updErr.message);
  }

  await createTimelineEntry(
    {
      title: `[Onboarding] Access declined for ${pending.email}`,
      activity_type: "other",
      content:
        declineReason === null || declineReason === ""
          ? `Declined by ${actorName}.`
          : `Declined by ${actorName}. Reason: ${declineReason}`,
      company_id: null,
      contact_id: null,
      user_id: pending.auth_user_id,
      created_by: user.id,
      updated_by: user.id,
      user_name: actorName,
    },
    admin,
  );

  revalidatePath("/profile");
}
