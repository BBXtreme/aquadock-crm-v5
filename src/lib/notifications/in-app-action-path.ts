import { parseInAppNotificationPayload } from "@/lib/validations/notification";
import type { UserNotification } from "@/types/database.types";

/**
 * Path-only deep link for a notification (same rules as the in-app notifications UI).
 * Does not include origin; pair with {@link getPublicSiteUrl} for absolute URLs in email.
 */
export function getInAppNotificationActionPath(notification: UserNotification): string {
  const payload = parseInAppNotificationPayload(notification.type, notification.payload);
  if (payload === null) {
    return "/dashboard";
  }
  if ("contactId" in payload) {
    return `/contacts/${payload.contactId}`;
  }
  return `/companies/${payload.companyId}`;
}
