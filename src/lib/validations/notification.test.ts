import { describe, expect, it } from "vitest";

import {
  createInAppNotificationInputSchema,
  IN_APP_NOTIFICATION_TYPES,
  parseInAppNotificationPayload,
} from "@/lib/validations/notification";

const userId = "10000000-0000-4000-8000-000000000001";
const _actorId = "10000000-0000-4000-8000-000000000002";
const companyId = "20000000-0000-4000-8000-000000000001";
const reminderId = "20000000-0000-4000-8000-000000000002";
const timelineId = "20000000-0000-4000-8000-000000000003";
const commentId = "20000000-0000-4000-8000-000000000004";
const parentCommentId = "20000000-0000-4000-8000-000000000005";
const contactId = "20000000-0000-4000-8000-000000000006";

describe("createInAppNotificationInputSchema", () => {
  it("accepts reminder_assigned with required fields", () => {
    const out = createInAppNotificationInputSchema.parse({
      type: "reminder_assigned",
      userId,
      title: "Reminder for you",
      body: "Body text",
      payload: { companyId, reminderId },
    });
    expect(out.type).toBe("reminder_assigned");
    expect(out.payload).toEqual({ companyId, reminderId });
  });

  it("accepts every IN_APP_NOTIFICATION_TYPES value with a matching payload", () => {
    for (const type of IN_APP_NOTIFICATION_TYPES) {
      if (type === "reminder_assigned") {
        const out = createInAppNotificationInputSchema.parse({
          type: "reminder_assigned",
          userId,
          title: "T",
          payload: { companyId, reminderId },
        });
        expect(out.type).toBe("reminder_assigned");
        continue;
      }
      if (type === "timeline_on_company") {
        const out = createInAppNotificationInputSchema.parse({
          type: "timeline_on_company",
          userId,
          title: "T",
          payload: { companyId, timelineId },
        });
        expect(out.type).toBe("timeline_on_company");
        continue;
      }
      if (type === "comment_reply") {
        const out = createInAppNotificationInputSchema.parse({
          type: "comment_reply",
          userId,
          title: "T",
          payload: { companyId, commentId, parentCommentId },
        });
        expect(out.type).toBe("comment_reply");
        continue;
      }
      if (type === "company_owner_assigned") {
        const out = createInAppNotificationInputSchema.parse({
          type: "company_owner_assigned",
          userId,
          title: "T",
          payload: { companyId },
        });
        expect(out.type).toBe("company_owner_assigned");
        continue;
      }
      if (type === "contact_assigned") {
        const out = createInAppNotificationInputSchema.parse({
          type: "contact_assigned",
          userId,
          title: "T",
          payload: { contactId },
        });
        expect(out.type).toBe("contact_assigned");
        continue;
      }
      throw new Error(`unhandled notification type: ${String(type)}`);
    }
  });

  it("normalizes empty string body to null for reminder_assigned", () => {
    const out = createInAppNotificationInputSchema.parse({
      type: "reminder_assigned",
      userId,
      title: "T",
      body: "",
      payload: { companyId, reminderId },
    });
    expect(out.body).toBeNull();
  });

  it("rejects wrong payload shape for discriminant type", () => {
    const r = createInAppNotificationInputSchema.safeParse({
      type: "reminder_assigned",
      userId,
      title: "T",
      payload: { companyId, timelineId },
    });
    expect(r.success).toBe(false);
  });

  it("rejects extra keys on strict payload", () => {
    const r = createInAppNotificationInputSchema.safeParse({
      type: "reminder_assigned",
      userId,
      title: "T",
      payload: { companyId, reminderId, extra: true },
    });
    expect(r.success).toBe(false);
  });
});

describe("parseInAppNotificationPayload", () => {
  it("parses valid JSON for each type", () => {
    expect(
      parseInAppNotificationPayload("reminder_assigned", { companyId, reminderId }),
    ).toEqual({ companyId, reminderId });
    expect(
      parseInAppNotificationPayload("timeline_on_company", { companyId, timelineId }),
    ).toEqual({ companyId, timelineId });
    expect(
      parseInAppNotificationPayload("comment_reply", {
        companyId,
        commentId,
        parentCommentId,
      }),
    ).toEqual({ companyId, commentId, parentCommentId });
    expect(parseInAppNotificationPayload("company_owner_assigned", { companyId })).toEqual({ companyId });
    expect(parseInAppNotificationPayload("contact_assigned", { contactId })).toEqual({ contactId });
    expect(parseInAppNotificationPayload("contact_assigned", { contactId, companyId })).toEqual({
      contactId,
      companyId,
    });
  });

  it("returns null for invalid payload or unknown type", () => {
    expect(
      parseInAppNotificationPayload("reminder_assigned", { companyId, reminderId, x: 1 }),
    ).toBeNull();
    expect(parseInAppNotificationPayload("reminder_assigned", { companyId: "nope", reminderId })).toBeNull();
    expect(parseInAppNotificationPayload("unknown_type", { companyId, reminderId })).toBeNull();
  });
});
