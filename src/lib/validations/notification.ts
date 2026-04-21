// Zod: in-app `user_notifications` — strict payloads per `type` (v1)
import { z } from "zod";

import type { Json } from "@/types/supabase";

const emptyStringToNull = (val: unknown) => (val === "" ? null : val);

/** Canonical `user_notifications.type` values for in-app v1. */
export const IN_APP_NOTIFICATION_TYPES = [
  "reminder_assigned",
  "timeline_on_company",
  "comment_reply",
] as const;

export type InAppNotificationType = (typeof IN_APP_NOTIFICATION_TYPES)[number];

export const inAppNotificationTypeSchema = z.enum(IN_APP_NOTIFICATION_TYPES);

const payloadReminderAssignedSchema = z
  .object({
    companyId: z.string().uuid(),
    reminderId: z.string().uuid(),
  })
  .strict();

const payloadTimelineOnCompanySchema = z
  .object({
    companyId: z.string().uuid(),
    timelineId: z.string().uuid(),
  })
  .strict();

const payloadCommentReplySchema = z
  .object({
    companyId: z.string().uuid(),
    commentId: z.string().uuid(),
    parentCommentId: z.string().uuid(),
  })
  .strict();

export type PayloadReminderAssigned = z.infer<typeof payloadReminderAssignedSchema>;
export type PayloadTimelineOnCompany = z.infer<typeof payloadTimelineOnCompanySchema>;
export type PayloadCommentReply = z.infer<typeof payloadCommentReplySchema>;

export type InAppNotificationPayload = PayloadReminderAssigned | PayloadTimelineOnCompany | PayloadCommentReply;

const optionalActor = z.preprocess(
  emptyStringToNull,
  z.union([z.string().uuid(), z.null()]),
).nullish();

const optionalDedupe = z.preprocess(
  emptyStringToNull,
  z.union([z.string().trim().min(1).max(200), z.null()]),
).nullish();

const optionalBody = z.preprocess(
  emptyStringToNull,
  z.union([z.string().trim().max(2000), z.null()]),
).nullish();

export const createInAppNotificationInputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("reminder_assigned"),
      userId: z.string().uuid(),
      title: z.string().trim().min(1).max(500),
      body: optionalBody,
      payload: payloadReminderAssignedSchema,
      actorUserId: optionalActor,
      dedupeKey: optionalDedupe,
    })
    .strict(),
  z
    .object({
      type: z.literal("timeline_on_company"),
      userId: z.string().uuid(),
      title: z.string().trim().min(1).max(500),
      body: optionalBody,
      payload: payloadTimelineOnCompanySchema,
      actorUserId: optionalActor,
      dedupeKey: optionalDedupe,
    })
    .strict(),
  z
    .object({
      type: z.literal("comment_reply"),
      userId: z.string().uuid(),
      title: z.string().trim().min(1).max(500),
      body: optionalBody,
      payload: payloadCommentReplySchema,
      actorUserId: optionalActor,
      dedupeKey: optionalDedupe,
    })
    .strict(),
]);

export type CreateInAppNotificationInput = z.infer<typeof createInAppNotificationInputSchema>;

/**
 * Parse `user_notifications.payload` from DB JSON for a known `type`.
 * Returns `null` if `type` is unknown or payload does not match.
 */
export function parseInAppNotificationPayload(
  type: string,
  payload: Json,
): InAppNotificationPayload | null {
  if (type === "reminder_assigned") {
    const r = payloadReminderAssignedSchema.safeParse(payload);
    return r.success ? r.data : null;
  }
  if (type === "timeline_on_company") {
    const r = payloadTimelineOnCompanySchema.safeParse(payload);
    return r.success ? r.data : null;
  }
  if (type === "comment_reply") {
    const r = payloadCommentReplySchema.safeParse(payload);
    return r.success ? r.data : null;
  }
  return null;
}
