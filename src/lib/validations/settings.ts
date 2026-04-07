import { z } from "zod";

export const notificationPreferencesSchema = z
  .object({
    pushEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  })
  .strict();

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

/** Client and server use the same parse path for notification payloads */
export function safeParseNotificationPreferences(input: unknown) {
  return notificationPreferencesSchema.safeParse(input);
}
