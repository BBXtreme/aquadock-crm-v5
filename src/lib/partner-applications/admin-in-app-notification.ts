import { createAdminClient } from "@/lib/supabase/admin";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import type { PartnerApplicationSubmitInput } from "@/lib/validations/partner-application";

export function buildPartnerApplicationNotificationCopy(input: {
  firstName: string;
  lastName: string;
  cityRegion: string;
  countryCode: string;
}): { title: string; body: string } {
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const location = `${input.cityRegion.trim()}, ${input.countryCode.trim()}`;
  return {
    title: "Neue Vertriebspartner-Bewerbung",
    body: `${name} (${location}) hat sich als Vertriebspartner beworben.`,
  };
}

/**
 * Inserts an in-app notification for every user with the admin role.
 * Failures for individual admins are logged and do not throw.
 */
export async function notifyAdminsOfNewPartnerApplication(args: {
  applicationId: string;
  input: Pick<
    PartnerApplicationSubmitInput,
    "firstName" | "lastName" | "cityRegion" | "countryCode"
  >;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: adminRows, error } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (error != null) {
    console.error("[partner-applications] admin role lookup failed", error.message);
    return;
  }

  const adminIds = Array.from(new Set((adminRows ?? []).map((row) => row.user_id)));
  if (adminIds.length === 0) {
    return;
  }

  const { title, body } = buildPartnerApplicationNotificationCopy(args.input);

  for (const adminId of adminIds) {
    try {
      await createInAppNotification(
        {
          type: "partner_application_received",
          userId: adminId,
          title,
          body,
          payload: { applicationId: args.applicationId },
          actorUserId: null,
          dedupeKey: `partner_application_received:${args.applicationId}:${adminId}`,
        },
        { mirrorToAdmins: false },
      );
    } catch (err) {
      console.error("[partner-applications] in-app admin notify failed", { adminId, err });
    }
  }
}
