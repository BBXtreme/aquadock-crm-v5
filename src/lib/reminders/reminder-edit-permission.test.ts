import { describe, expect, it } from "vitest";
import { canEditReminderRecord } from "@/lib/reminders/reminder-edit-permission";

const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";

describe("canEditReminderRecord", () => {
  it("allows admin regardless of owner or assignee", () => {
    expect(
      canEditReminderRecord(
        { user_id: OWNER, assigned_to: OTHER },
        { id: OTHER, roles: ["user", "admin"] },
      ),
    ).toBe(true);
  });

  it("allows owner when user_id matches viewer", () => {
    expect(
      canEditReminderRecord({ user_id: OWNER, assigned_to: null }, { id: OWNER, roles: ["user"] }),
    ).toBe(true);
  });

  it("allows assignee when assigned_to matches viewer", () => {
    expect(
      canEditReminderRecord({ user_id: OWNER, assigned_to: OTHER }, { id: OTHER, roles: ["user"] }),
    ).toBe(true);
  });

  it("denies unrelated user", () => {
    expect(
      canEditReminderRecord({ user_id: OWNER, assigned_to: null }, { id: OTHER, roles: ["user"] }),
    ).toBe(false);
  });
});
