import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  resolveReminderDetail,
  resolveTimelineDetail,
} from "@/lib/actions/resolve-detail";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";

function clientForReminder(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("reminders");
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
      };
    }),
  } as unknown as SupabaseClient;
}

function clientForTimeline(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("timeline");
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
      };
    }),
  } as unknown as SupabaseClient;
}

describe("resolveReminderDetail", () => {
  silenceHandleSupabaseErrorConsole();

  it("throws on Supabase error", async () => {
    const client = clientForReminder({ data: null, error: { message: "no" } });
    await expect(resolveReminderDetail("rid", client)).rejects.toThrow("Database error");
  });

  it("returns missing when row is absent", async () => {
    const client = clientForReminder({ data: null, error: null });
    await expect(resolveReminderDetail("rid", client)).resolves.toEqual({ kind: "missing" });
  });

  it("returns trashed when deleted_at is set", async () => {
    const client = clientForReminder({
      data: { id: "r1", deleted_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    await expect(resolveReminderDetail("r1", client)).resolves.toEqual({ kind: "trashed" });
  });

  it("returns active when deleted_at is null", async () => {
    const row = { id: "r1", deleted_at: null, title: "T" };
    const client = clientForReminder({ data: row, error: null });
    await expect(resolveReminderDetail("r1", client)).resolves.toEqual({
      kind: "active",
      reminder: row,
    });
  });
});

describe("resolveTimelineDetail", () => {
  silenceHandleSupabaseErrorConsole();

  it("throws on Supabase error", async () => {
    const client = clientForTimeline({ data: null, error: { message: "no" } });
    await expect(resolveTimelineDetail("tid", client)).rejects.toThrow("Database error");
  });

  it("returns missing when row is absent", async () => {
    const client = clientForTimeline({ data: null, error: null });
    await expect(resolveTimelineDetail("tid", client)).resolves.toEqual({ kind: "missing" });
  });

  it("returns trashed when deleted_at is set", async () => {
    const client = clientForTimeline({
      data: { id: "t1", deleted_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    await expect(resolveTimelineDetail("t1", client)).resolves.toEqual({ kind: "trashed" });
  });

  it("returns active when deleted_at is null", async () => {
    const row = { id: "t1", deleted_at: null, title: "Entry" };
    const client = clientForTimeline({ data: row, error: null });
    await expect(resolveTimelineDetail("t1", client)).resolves.toEqual({
      kind: "active",
      entry: row,
    });
  });
});
