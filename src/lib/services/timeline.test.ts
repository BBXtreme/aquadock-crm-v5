import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createTimelineEntry, getTimelineEntries, updateTimelineEntry } from "./timeline";

describe("timeline service", () => {
  it("createTimelineEntry returns row", async () => {
    const row = { id: "t1", title: "x" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(
      createTimelineEntry(
        { title: "x", user_id: "u", created_by: "u", updated_by: "u" } as never,
        client,
      ),
    ).resolves.toEqual(row);
  });

  it("updateTimelineEntry returns row", async () => {
    const row = { id: "t1" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(updateTimelineEntry("t1", { title: "y" } as never, client)).resolves.toEqual(row);
  });

  it("getTimelineEntries returns list", async () => {
    const rows = [{ id: "1" }];
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      })),
    } as unknown as SupabaseClient;

    await expect(getTimelineEntries("u1", client)).resolves.toEqual(rows);
  });

  it("propagates insert error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "e" } });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(
      createTimelineEntry({ title: "x" } as never, client),
    ).rejects.toEqual({ message: "e" });
  });

  it("propagates update error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "u" } });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(updateTimelineEntry("id", {} as never, client)).rejects.toEqual({ message: "u" });
  });

  it("propagates list error", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "l" } }),
      })),
    } as unknown as SupabaseClient;

    await expect(getTimelineEntries("u", client)).rejects.toEqual({ message: "l" });
  });
});
