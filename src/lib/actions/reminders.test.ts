import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createReminder, getReminderById, getReminders, updateReminder } from "./reminders";

describe("reminders actions", () => {
  it("getReminders returns data", async () => {
    const rows = [{ id: "1", title: "t" }];
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: rows, error: null }),
      })),
    } as unknown as SupabaseClient;
    await expect(getReminders(client)).resolves.toEqual(rows);
  });

  it("getReminders throws on error", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: "e" } }),
      })),
    } as unknown as SupabaseClient;
    await expect(getReminders(client)).rejects.toThrow();
  });

  it("getReminderById returns row", async () => {
    const row = { id: "r1" };
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      })),
    } as unknown as SupabaseClient;
    await expect(getReminderById("r1", client)).resolves.toEqual(row);
  });

  it("createReminder returns inserted", async () => {
    const row = { id: "n" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createReminder({ title: "t" } as never, client)).resolves.toEqual(row);
  });

  it("updateReminder returns updated", async () => {
    const row = { id: "u" };
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
    await expect(updateReminder("u", { title: "x" } as never, client)).resolves.toEqual(row);
  });

  it("getReminderById throws on Supabase error", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "e" } }),
      })),
    } as unknown as SupabaseClient;
    await expect(getReminderById("r1", client)).rejects.toThrow();
  });

  it("createReminder throws on Supabase error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createReminder({ title: "t" } as never, client)).rejects.toThrow();
  });

  it("updateReminder throws on Supabase error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "update failed" } });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(updateReminder("id", { title: "x" } as never, client)).rejects.toThrow();
  });
});
