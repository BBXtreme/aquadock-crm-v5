"use server";

import { z } from "zod";
import { revalidateAdminUserManagement } from "@/lib/next-cache/revalidate-admin-user-management";
import {
  sendNotificationHtmlEmail,
} from "@/lib/services/smtp";
import { createTimelineEntry } from "@/lib/services/timeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthRedirectUrl, resolveSiteOrigin } from "@/lib/utils/auth-recovery-redirect";
import { safeDisplay } from "@/lib/utils/data-format";
import { accessRequestSchema } from "@/lib/validations/access-request";

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

function escapeHtmlTextForEmail(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getAdminNotificationRecipientEmails(): Promise<string[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error !== null || rows === null || rows.length === 0) {
    return [];
  }
  const emails: string[] = [];
  for (const row of rows) {
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(
      row.id,
    );
    if (authErr !== null || authData.user === undefined) {
      continue;
    }
    const em = authData.user.email;
    if (typeof em === "string" && em.length > 0) {
      emails.push(em);
    }
  }
  return [...new Set(emails)];
}

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

/**
 * Public apply: create auth user (Supabase sends confirmation email) + `pending_users` row.
 * Uses service role so it works when `signUp` would not establish a session until confirm.
 */
export async function submitAccessRequest(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = accessRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ??
      first.password?.[0] ??
      first.confirm_password?.[0] ??
      "Invalid input";
    return { ok: false, message: msg };
  }
  const input = parsed.data;
  const admin = createAdminClient();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      user_metadata:
        input.display_name === null
          ? {}
          : { display_name: input.display_name },
      email_confirm: false,
    });

  if (createErr !== null) {
    return { ok: false, message: createErr.message };
  }
  if (created.user === undefined) {
    return { ok: false, message: "Failed to create user" };
  }

  const uid = created.user.id;
  const { error: pendErr } = await admin.from("pending_users").insert({
    email: input.email,
    display_name: input.display_name,
    auth_user_id: uid,
    status: "pending_email_confirmation",
  });

  if (pendErr !== null) {
    return { ok: false, message: pendErr.message };
  }

  const title = `[Onboarding] Access requested by ${input.email}`;
  const dn =
    input.display_name === null || input.display_name === ""
      ? ""
      : safeDisplay(input.display_name, "");
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
      user_id: uid,
      created_by: null,
      updated_by: null,
      user_name: dn === "" ? null : dn,
    },
    admin,
  );

  const recipients = await getAdminNotificationRecipientEmails();
  if (recipients.length > 0) {
    try {
      const origin = await resolveSiteOrigin();
      const reqEmailHtml = escapeHtmlTextForEmail(input.email);
      await sendNotificationHtmlEmail({
        to: recipients,
        subject: `[AquaDock CRM] New access request: ${input.email}`,
        html: `<p>A new user requested access: <strong>${reqEmailHtml}</strong>.</p><p><a href="${origin}/admin/users">Review in User Management</a></p>`,
      });
    } catch (e) {
      console.error("[onboarding] admin notify email failed:", e);
    }
  }

  revalidateAdminUserManagement();
  return { ok: true };
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
  const applicantNameHtml = escapeHtmlTextForEmail(
    safeDisplay(displayName, email),
  );
  const actorNameHtml = escapeHtmlTextForEmail(actorName);
  const emailHtml = escapeHtmlTextForEmail(email);
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
        await sendNotificationHtmlEmail({
          actingAdminUserId: user.id,
          to: [email],
          subject: "[AquaDock CRM] Access granted — set your password",
          html: `<p>Hello ${applicantNameHtml},</p><p>Your access was approved by ${actorNameHtml}. <a href="${actionLink}">Set your password</a> to continue.</p>`,
        });
      } catch (e) {
        console.error("[onboarding] fallback recovery mail failed:", e);
      }
    }
  } else {
    try {
      await sendNotificationHtmlEmail({
        actingAdminUserId: user.id,
        to: [email],
        subject: "[AquaDock CRM] Access granted",
        html: `<p>Hello ${applicantNameHtml},</p><p>Your access was approved by ${actorNameHtml}. Check your inbox for a link to set your password.</p>`,
      });
    } catch (e) {
      console.error("[onboarding] applicant access granted email failed:", e);
    }
  }

  try {
    const admins = await getAdminNotificationRecipientEmails();
    if (admins.length > 0) {
      await sendNotificationHtmlEmail({
        actingAdminUserId: user.id,
        to: admins,
        subject: `[AquaDock CRM] Access accepted: ${email}`,
        html: `<p>${applicantNameHtml} (<strong>${emailHtml}</strong>) was approved by ${actorNameHtml} with role <strong>${chosenRole}</strong>.</p>`,
      });
    }
  } catch (e) {
    console.error("[onboarding] admin notify (accept) failed:", e);
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

  revalidateAdminUserManagement();
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

  try {
    const admins = await getAdminNotificationRecipientEmails();
    if (admins.length > 0) {
      const reasonHtml =
        declineReason === null ||
        declineReason === undefined ||
        declineReason === ""
          ? ""
          : `<p>Reason: ${escapeHtmlTextForEmail(declineReason)}</p>`;
      const declinedEmailHtml = escapeHtmlTextForEmail(pending.email);
      await sendNotificationHtmlEmail({
        actingAdminUserId: user.id,
        to: admins,
        subject: `[AquaDock CRM] Access declined: ${pending.email}`,
        html: `<p><strong>${declinedEmailHtml}</strong> was declined by ${escapeHtmlTextForEmail(actorName)}.</p>${reasonHtml}`,
      });
    }
  } catch (e) {
    console.error("[onboarding] admin notify (decline) failed:", e);
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

  revalidateAdminUserManagement();
}
