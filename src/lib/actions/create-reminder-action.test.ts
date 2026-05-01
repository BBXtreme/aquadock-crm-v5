import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Reminder } from "@/types/database.types";

const createInAppNotification = vi.hoisted(() => vi.fn());
const createReminder = vi.hoisted(() => vi.fn());
const getCurrentUser = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification,
}));

vi.mock("@/lib/services/reminders", () => ({
  createReminder,
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const ACTOR = "10000000-0000-4000-8000-000000000001";
const ASSIGNEE = "10000000-0000-4000-8000-000000000002";
const COMPANY_ID = "20000000-0000-4000-8000-000000000001";
const REMINDER_ID = "30000000-0000-4000-8000-000000000001";

function futureIso(msFromNow = 7 * 24 * 60 * 60 * 1000): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

function baseInput() {
  return {
    title: "Follow up",
    company_id: COMPANY_ID,
    due_date: futureIso(),
  };
}

function reminderRow(assignedTo: string | null): Reminder {
  return {
    id: REMINDER_ID,
    title: "Follow up",
    company_id: COMPANY_ID,
    assigned_to: assignedTo,
  } as Reminder;
}

describe("createReminderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: ACTOR });
    createServerSupabaseClient.mockResolvedValue({} as never);
    createInAppNotification.mockResolvedValue({ id: "n1" } as never);
  });

  it("throws Unauthorized when there is no current user", async () => {
    getCurrentUser.mockResolvedValue(null);
    createReminder.mockResolvedValue(reminderRow(null));

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    await expect(createReminderAction(baseInput())).rejects.toThrow("Unauthorized");

    expect(createReminder).not.toHaveBeenCalled();
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("does not notify when assigned_to is null", async () => {
    createReminder.mockResolvedValue(reminderRow(null));

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    const result = await createReminderAction({
      ...baseInput(),
      assigned_to: "",
    });

    expect(result.id).toBe(REMINDER_ID);
    expect(createInAppNotification).not.toHaveBeenCalled();
  });

  it("does not notify when assignee is the current user", async () => {
    createReminder.mockResolvedValue(reminderRow(ACTOR));

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    await createReminderAction({
      ...baseInput(),
      assigned_to: ACTOR,
    });

    expect(createInAppNotification).not.toHaveBeenCalled();
  });

  it("creates in-app notification when assignee is another user", async () => {
    createReminder.mockResolvedValue(reminderRow(ASSIGNEE));

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    await createReminderAction({
      ...baseInput(),
      assigned_to: ASSIGNEE,
    });

    expect(createInAppNotification).toHaveBeenCalledTimes(1);
    expect(createInAppNotification).toHaveBeenCalledWith({
      type: "reminder_assigned",
      userId: ASSIGNEE,
      title: "Neue Aufgabe zugewiesen",
      body: "Follow up",
      payload: {
        companyId: COMPANY_ID,
        reminderId: REMINDER_ID,
      },
      actorUserId: ACTOR,
      dedupeKey: `reminder_assigned:${REMINDER_ID}:${ASSIGNEE}`,
    });
  });

  it("returns the reminder when notification fails", async () => {
    createReminder.mockResolvedValue(reminderRow(ASSIGNEE));
    createInAppNotification.mockRejectedValue(new Error("notify failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    await expect(
      createReminderAction({
        ...baseInput(),
        assigned_to: ASSIGNEE,
      }),
    ).resolves.toEqual(reminderRow(ASSIGNEE));

    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("maps optional fields and trims description", async () => {
    createReminder.mockImplementation(async (insert: unknown) => {
      expect(insert).toMatchObject({
        title: "T",
        company_id: COMPANY_ID,
        priority: "high",
        status: "done",
        assigned_to: null,
        description: "Notes",
      });
      return reminderRow(null);
    });

    const { createReminderAction } = await import("@/lib/actions/create-reminder-action");
    await createReminderAction({
      ...baseInput(),
      title: "T",
      priority: "high",
      status: "done",
      description: "  Notes  ",
    });
  });
});
