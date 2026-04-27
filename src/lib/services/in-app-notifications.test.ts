import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";

const emailTestDeps = vi.hoisted(() => ({
  sendNotificationHtmlEmail: vi.fn().mockResolvedValue(undefined),
  fetchNotificationPreferences: vi.fn().mockResolvedValue({ pushEnabled: true, emailEnabled: false }),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  sendNotificationHtmlEmail: emailTestDeps.sendNotificationHtmlEmail,
}));

vi.mock("@/lib/services/user-settings", () => ({
  fetchNotificationPreferences: emailTestDeps.fetchNotificationPreferences,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import {
  createInAppNotification,
  getUnreadCount,
  listNotificationsForUser,
  listNotificationsForUserPage,
  markAllRead,
  markAsRead,
} from "./in-app-notifications";

const userId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const companyId = "20000000-0000-4000-8000-000000000001";
const reminderId = "20000000-0000-4000-8000-000000000002";

describe("createInAppNotification", () => {
  silenceHandleSupabaseErrorConsole();

  beforeEach(() => {
    vi.clearAllMocks();
    emailTestDeps.fetchNotificationPreferences.mockResolvedValue({ pushEnabled: true, emailEnabled: false });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when actor is the same as recipient", async () => {
    const result = await createInAppNotification({
      type: "reminder_assigned",
      userId,
      title: "T",
      payload: { companyId, reminderId },
      actorUserId: userId,
    });
    expect(result).toBeNull();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("inserts via admin and returns the row on success", async () => {
    const row = { id: "n1", user_id: userId } as never;
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as never);

    await expect(
      createInAppNotification(
        {
          type: "reminder_assigned",
          userId,
          title: "Hello",
          payload: { companyId, reminderId },
          actorUserId: actorId,
        },
        { mirrorToAdmins: false },
      ),
    ).resolves.toEqual(row);
    expect(single).toHaveBeenCalled();
  });

  it("does not send notification email when email channel is disabled", async () => {
    const row = { id: "n1", user_id: userId } as never;
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as never);

    await createInAppNotification(
      {
        type: "reminder_assigned",
        userId,
        title: "Hello",
        payload: { companyId, reminderId },
        actorUserId: actorId,
      },
      { mirrorToAdmins: false },
    );
    expect(emailTestDeps.sendNotificationHtmlEmail).not.toHaveBeenCalled();
  });

  it("sends notification email when email is enabled and recipient has an address", async () => {
    emailTestDeps.fetchNotificationPreferences.mockResolvedValue({ pushEnabled: true, emailEnabled: true });
    const row = {
      id: "n1",
      user_id: userId,
      type: "reminder_assigned" as const,
      title: "Hello",
      body: null,
      payload: { companyId, reminderId },
      actor_user_id: actorId,
      read_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      dedupe_key: null,
    };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const getUserById = vi.fn().mockResolvedValue({
      data: { user: { email: "user@example.com" } },
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
      auth: { admin: { getUserById } },
    } as never);

    await createInAppNotification(
      {
        type: "reminder_assigned",
        userId,
        title: "Hello",
        payload: { companyId, reminderId },
        actorUserId: actorId,
      },
      { mirrorToAdmins: false },
    );

    expect(emailTestDeps.sendNotificationHtmlEmail).toHaveBeenCalledTimes(1);
    expect(emailTestDeps.sendNotificationHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user@example.com"],
        subject: "Hello",
        actingAdminUserId: actorId,
      }),
    );
  });

  it("returns null on unique violation when dedupeKey is set", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "dup" },
    });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as never);

    const result = await createInAppNotification(
      {
        type: "reminder_assigned",
        userId,
        title: "T",
        payload: { companyId, reminderId },
        actorUserId: actorId,
        dedupeKey: "key-1",
      },
      { mirrorToAdmins: false },
    );
    expect(result).toBeNull();
  });

  it("throws on unique violation when dedupeKey is missing", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "dup" },
    });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as never);

    await expect(
      createInAppNotification(
        {
          type: "reminder_assigned",
          userId,
          title: "T",
          payload: { companyId, reminderId },
          actorUserId: actorId,
        },
        { mirrorToAdmins: false },
      ),
    ).rejects.toMatchObject({ message: /Database error/ });
  });

  it("only queries user_notifications once when mirrorToAdmins is false", async () => {
    const row = {
      id: "n1",
      user_id: userId,
      type: "reminder_assigned",
      title: "Hello",
      body: null,
      payload: { companyId, reminderId },
      actor_user_id: actorId,
    } as const;
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const from = vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    }));
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    await createInAppNotification(
      {
        type: "reminder_assigned",
        userId,
        title: "Hello",
        payload: { companyId, reminderId },
        actorUserId: actorId,
      },
      { mirrorToAdmins: false },
    );

    const notifCalls = from.mock.calls.filter((c) => (c as unknown as [string])[0] === "user_notifications");
    expect(notifCalls).toHaveLength(1);
  });

  it("inserts when actor equals recipient if mirrorInsert is true (admin copy)", async () => {
    const row = { id: "n1", user_id: userId } as never;
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as never);

    await expect(
      createInAppNotification(
        {
          type: "reminder_assigned",
          userId,
          title: "T",
          payload: { companyId, reminderId },
          actorUserId: userId,
        },
        { mirrorToAdmins: false, mirrorInsert: true },
      ),
    ).resolves.toEqual(row);
    expect(single).toHaveBeenCalled();
  });
});

describe("in-app list / read helpers", () => {
  it("listNotificationsForUser returns rows and chains eq/order/limit", async () => {
    const rows = [{ id: "1" }] as never;
    const res = { data: rows, error: null };
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve(res),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(listNotificationsForUser(client, userId)).resolves.toEqual(rows);
  });

  it("listNotificationsForUser applies beforeCreatedAt via lt", async () => {
    const rows: never[] = [];
    const res = { data: rows, error: null };
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                lt: () => Promise.resolve(res),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      listNotificationsForUser(client, userId, { beforeCreatedAt: "2026-01-01T00:00:00.000Z" }),
    ).resolves.toEqual(rows);
  });

  it("listNotificationsForUserPage uses range and returns total count", async () => {
    const rows = [{ id: "1" }] as never;
    const range = vi.fn().mockResolvedValue({ data: rows, error: null, count: 42 });
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(listNotificationsForUserPage(client, userId, { page: 1, pageSize: 10 })).resolves.toEqual({
      rows,
      total: 42,
    });
    expect(range).toHaveBeenCalledWith(10, 19);
  });

  it("getUnreadCount returns count", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ count: 3, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(getUnreadCount(client, userId)).resolves.toBe(3);
  });

  it("getUnreadCount returns 0 when count is null", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ count: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(getUnreadCount(client, userId)).resolves.toBe(0);
  });

  it("markAsRead and markAllRead resolve when update succeeds", async () => {
    const markAs = vi.fn().mockResolvedValue({ error: null });
    const firstChain = {
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              is: markAs,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(markAsRead(firstChain, userId, "id-1")).resolves.toBeUndefined();
    expect(markAs).toHaveBeenCalled();

    const markAll = vi.fn().mockResolvedValue({ error: null });
    const secondChain = {
      from: () => ({
        update: () => ({
          eq: () => ({
            is: markAll,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(markAllRead(secondChain, userId)).resolves.toBeUndefined();
    expect(markAll).toHaveBeenCalled();
  });
});
