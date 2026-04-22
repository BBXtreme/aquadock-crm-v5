import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInAppNotification,
  getUnreadCount,
  listNotificationsForUser,
  markAllRead,
  markAsRead,
} from "./in-app-notifications";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const userId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const companyId = "20000000-0000-4000-8000-000000000001";
const reminderId = "20000000-0000-4000-8000-000000000002";

describe("createInAppNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      createInAppNotification({
        type: "reminder_assigned",
        userId,
        title: "Hello",
        payload: { companyId, reminderId },
        actorUserId: actorId,
      }),
    ).resolves.toEqual(row);
    expect(single).toHaveBeenCalled();
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

    const result = await createInAppNotification({
      type: "reminder_assigned",
      userId,
      title: "T",
      payload: { companyId, reminderId },
      actorUserId: actorId,
      dedupeKey: "key-1",
    });
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
      createInAppNotification({
        type: "reminder_assigned",
        userId,
        title: "T",
        payload: { companyId, reminderId },
        actorUserId: actorId,
      }),
    ).rejects.toMatchObject({ message: /Database error/ });
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
