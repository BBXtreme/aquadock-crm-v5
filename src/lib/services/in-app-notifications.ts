// Server-only: in-app `user_notifications` (inserts via service role; reads via user JWT + RLS)
import {
  ADMIN_GLOBAL_IN_APP_FEED_DEFAULT,
  ADMIN_IN_APP_MIRROR_TITLE_PREFIX,
  formatAdminInAppMirrorRecipientLine,
  NOTIFICATION_SETTING_KEYS,
} from "@/lib/constants/notifications";
import { buildNotificationEmailContent } from "@/lib/email/build-notification-email";
import { sendNotificationHtmlEmail } from "@/lib/services/smtp-delivery";
import { fetchNotificationPreferences } from "@/lib/services/user-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import {
  type CreateInAppNotificationInput,
  createInAppNotificationInputSchema,
} from "@/lib/validations/notification";
import type { UserNotification } from "@/types/database.types";

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function settingsValueToBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export type CreateInAppNotificationOptions = {
  /**
   * When false (e.g. admin feed copies), do not fan out further mirrors. Default: true.
   */
  mirrorToAdmins?: boolean;
  /**
   * When true (admin feed copy rows), allow actor and recipient to be the same user so the acting admin can still receive a copy.
   */
  mirrorInsert?: boolean;
};

function buildMirrorBody(recipientLine: string, originalBody: string | null): string | null {
  if (originalBody == null || originalBody === "") {
    return recipientLine;
  }
  return `${recipientLine}\n${originalBody}`;
}

/**
 * Sends CRM notification email when preferences + SMTP allow. Never throws.
 */
async function maybeSendInAppEmailForNotificationRow(
  row: UserNotification,
  options: { actingUserId: string | null; isAdminMirror: boolean },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { emailEnabled } = await fetchNotificationPreferences(admin, row.user_id);
    if (!emailEnabled) {
      return;
    }
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(row.user_id);
    if (authErr != null) {
      console.error("[maybeSendInAppEmailForNotificationRow] getUserById failed", authErr);
      return;
    }
    const email = authData.user?.email;
    if (email == null || email === "") {
      return;
    }
    const { subject, html, text } = buildNotificationEmailContent(row, options.isAdminMirror);
    await sendNotificationHtmlEmail({
      actingAdminUserId: options.actingUserId,
      to: [email],
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[maybeSendInAppEmailForNotificationRow] failed", err);
  }
}

async function mirrorInAppNotificationToAdmins(primary: UserNotification): Promise<void> {
  const admin = createAdminClient();

  const { data: adminRows, error: adminErr } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adminErr != null) {
    console.error("[mirrorInAppNotificationToAdmins] profiles admin list failed", adminErr);
    return;
  }

  const adminIds = (adminRows ?? []).map((r) => r.id);
  if (adminIds.length === 0) {
    return;
  }

  const { data: settingsRows, error: settingsErr } = await admin
    .from("user_settings")
    .select("user_id, value")
    .eq("key", NOTIFICATION_SETTING_KEYS.adminGlobalInAppFeed)
    .in("user_id", adminIds);

  if (settingsErr != null) {
    console.error("[mirrorInAppNotificationToAdmins] user_settings batch failed", settingsErr);
    return;
  }

  const optedIn = new Set<string>();
  for (const row of settingsRows ?? []) {
    if (settingsValueToBoolean(row.value, ADMIN_GLOBAL_IN_APP_FEED_DEFAULT)) {
      optedIn.add(row.user_id);
    }
  }

  const { data: recipientProfile, error: profileErr } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", primary.user_id)
    .maybeSingle();

  if (profileErr != null) {
    console.error("[mirrorInAppNotificationToAdmins] recipient profile lookup failed", profileErr);
  }

  const recipientLabel =
    recipientProfile?.display_name != null && recipientProfile.display_name.trim() !== ""
      ? recipientProfile.display_name.trim()
      : primary.user_id;

  const recipientLine = formatAdminInAppMirrorRecipientLine(recipientLabel);
  const mirrorBody = buildMirrorBody(recipientLine, primary.body);

  const rawTitle = primary.title.startsWith(ADMIN_IN_APP_MIRROR_TITLE_PREFIX)
    ? primary.title
    : `${ADMIN_IN_APP_MIRROR_TITLE_PREFIX}${primary.title}`;
  const baseTitle = rawTitle.length > 500 ? rawTitle.slice(0, 500) : rawTitle;

  for (const adminId of adminIds) {
    if (adminId === primary.user_id) {
      continue;
    }
    if (!optedIn.has(adminId)) {
      continue;
    }

    const mirrorInput = createInAppNotificationInputSchema.parse({
      type: primary.type,
      userId: adminId,
      title: baseTitle,
      body: mirrorBody,
      payload: primary.payload,
      actorUserId: primary.actor_user_id,
      dedupeKey: `admin_feed:${primary.id}:${adminId}`,
    });

    try {
      await createInAppNotification(mirrorInput, {
        mirrorToAdmins: false,
        mirrorInsert: true,
      });
    } catch (err) {
      console.error("[mirrorInAppNotificationToAdmins] mirror insert failed", { adminId, err });
    }
  }
}

/**
 * Insert a notification for another user. Skips when actor and recipient are the same (unless `mirrorInsert`).
 * Returns `null` on skip, on dedupe conflict (23505), or if service role env is missing (throws from createAdminClient).
 */
export async function createInAppNotification(
  input: CreateInAppNotificationInput,
  options?: CreateInAppNotificationOptions,
): Promise<UserNotification | null> {
  const parsed = createInAppNotificationInputSchema.parse(input);
  const mirrorToAdmins = options?.mirrorToAdmins !== false;
  const mirrorInsert = options?.mirrorInsert === true;
  if (
    !mirrorInsert &&
    parsed.actorUserId != null &&
    parsed.actorUserId === parsed.userId
  ) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .insert({
      user_id: parsed.userId,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body ?? null,
      payload: parsed.payload,
      actor_user_id: parsed.actorUserId ?? null,
      dedupe_key: parsed.dedupeKey ?? null,
    })
    .select()
    .single();

  if (error) {
    if (isPostgresUniqueViolation(error) && parsed.dedupeKey) {
      return null;
    }
    throw handleSupabaseError(error, "createInAppNotification");
  }

  if (data == null) {
    throw new Error("createInAppNotification: no row returned");
  }

  await maybeSendInAppEmailForNotificationRow(data, {
    actingUserId: parsed.actorUserId ?? null,
    isAdminMirror: mirrorInsert,
  });

  if (mirrorToAdmins) {
    try {
      await mirrorInAppNotificationToAdmins(data);
    } catch (err) {
      console.error("[createInAppNotification] mirrorInAppNotificationToAdmins failed", err);
    }
  }

  return data;
}

export type { CreateInAppNotificationInput } from "@/lib/validations/notification";
