import { z } from "zod";

export const notificationPreferencesSchema = z
  .object({
    pushEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  })
  .strict();

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const trashBinPreferenceSchema = z
  .object({
    trashBinEnabled: z.boolean(),
  })
  .strict();

export type TrashBinPreference = z.infer<typeof trashBinPreferenceSchema>;

export * from "./appearance";
