import { describe, expect, it, vi } from "vitest";
import type { UserNotification } from "@/types/database.types";
import { buildNotificationEmailContent } from "./build-notification-email";

vi.mock("@/lib/utils/site-url", () => ({
  getPublicSiteUrl: () => "https://app.example.com",
}));

const companyId = "20000000-0000-4000-8000-000000000001";
const reminderId = "20000000-0000-4000-8000-000000000002";

describe("buildNotificationEmailContent", () => {
  it("returns subject, html with CTA link, and plain text", () => {
    const row = {
      id: "30000000-0000-4000-8000-000000000001",
      user_id: "10000000-0000-4000-8000-000000000001",
      type: "reminder_assigned",
      title: "Reminder due",
      body: "Details here",
      payload: { companyId, reminderId },
      actor_user_id: null,
      read_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      dedupe_key: null,
    } as UserNotification;

    const { subject, html, text } = buildNotificationEmailContent(row, false);

    expect(subject).toBe("Reminder due");
    expect(html).toContain(`https://app.example.com/companies/${companyId}`);
    expect(html).toContain('href="https://app.example.com/companies/');
    expect(text).toContain(`https://app.example.com/companies/${companyId}`);
    expect(text).toContain("Reminder due");
    expect(text).toContain("Details here");
  });

  it("uses admin mirror intro when isAdminMirror is true", () => {
    const row = {
      id: "30000000-0000-4000-8000-000000000001",
      user_id: "10000000-0000-4000-8000-000000000001",
      type: "timeline_on_company",
      title: "Update",
      body: null,
      payload: { companyId, timelineId: "20000000-0000-4000-8000-000000000099" },
      actor_user_id: null,
      read_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      dedupe_key: null,
    } as UserNotification;

    const { text } = buildNotificationEmailContent(row, true);
    expect(text).toContain("Admin-Überblick");
  });
});
