import { describe, expect, it } from "vitest";
import type { UserNotification } from "@/types/database.types";
import { getInAppNotificationActionPath } from "./in-app-action-path";

const base = {
  id: "30000000-0000-4000-8000-000000000001",
  user_id: "10000000-0000-4000-8000-000000000001",
  read_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  body: null,
  actor_user_id: null,
  dedupe_key: null,
} as const;

const companyId = "20000000-0000-4000-8000-000000000001";
const contactId = "20000000-0000-4000-8000-000000000002";
const reminderId = "20000000-0000-4000-8000-000000000003";
const timelineId = "20000000-0000-4000-8000-000000000004";
const commentId = "20000000-0000-4000-8000-000000000005";
const parentCommentId = "20000000-0000-4000-8000-000000000006";

function row(overrides: Partial<UserNotification> & Pick<UserNotification, "type" | "title" | "payload">): UserNotification {
  return { ...base, ...overrides } as UserNotification;
}

describe("getInAppNotificationActionPath", () => {
  it("reminder_assigned → company", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "reminder_assigned",
          title: "R",
          payload: { companyId, reminderId },
        }),
      ),
    ).toBe(`/companies/${companyId}`);
  });

  it("timeline_on_company → company", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "timeline_on_company",
          title: "T",
          payload: { companyId, timelineId },
        }),
      ),
    ).toBe(`/companies/${companyId}`);
  });

  it("comment_reply → company", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "comment_reply",
          title: "C",
          payload: { companyId, commentId, parentCommentId },
        }),
      ),
    ).toBe(`/companies/${companyId}`);
  });

  it("company_owner_assigned → company", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "company_owner_assigned",
          title: "O",
          payload: { companyId },
        }),
      ),
    ).toBe(`/companies/${companyId}`);
  });

  it("contact_assigned → contact", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "contact_assigned",
          title: "K",
          payload: { contactId, companyId },
        }),
      ),
    ).toBe(`/contacts/${contactId}`);
  });

  it("invalid payload → dashboard", () => {
    expect(
      getInAppNotificationActionPath(
        row({
          type: "reminder_assigned",
          title: "R",
          payload: {},
        }),
      ),
    ).toBe("/dashboard");
  });
});
