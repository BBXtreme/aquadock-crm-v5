import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { NOTIFICATION_SETTING_KEYS, NOTIFICATION_UI } from "@/lib/constants/notifications";
import type { Database } from "@/types/database.types";
import {
  fetchNotificationPreferences,
  fetchTrashBinPreference,
  saveNotificationPreferencesFromInput,
  saveTrashBinPreferenceFromInput,
  TRASH_BIN_UI,
  upsertNotificationPreferences,
  upsertTrashBinPreference,
} from "./user-settings";

type Client = SupabaseClient<Database>;

function notificationPrefsChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn(() => chain) } as unknown as Client;
}

function trashBinChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn(() => chain) } as unknown as Client;
}

describe("user-settings (DB helpers)", () => {
  it("fetchNotificationPreferences throws on Supabase error", async () => {
    const client = notificationPrefsChain({ data: null, error: { message: "boom" } });
    await expect(fetchNotificationPreferences(client, "u1")).rejects.toThrow("Database error");
  });

  it("fetchNotificationPreferences uses defaults when no rows", async () => {
    const client = notificationPrefsChain({ data: [], error: null });
    await expect(fetchNotificationPreferences(client, "u1")).resolves.toEqual({
      pushEnabled: true,
      emailEnabled: true,
    });
  });

  it("fetchNotificationPreferences parses boolean and string values", async () => {
    const client = notificationPrefsChain({
      data: [
        { key: NOTIFICATION_SETTING_KEYS.push, value: false },
        { key: NOTIFICATION_SETTING_KEYS.email, value: "false" },
      ],
      error: null,
    });
    await expect(fetchNotificationPreferences(client, "u1")).resolves.toEqual({
      pushEnabled: false,
      emailEnabled: false,
    });
  });

  it("fetchNotificationPreferences treats unknown values as defaults per key", async () => {
    const client = notificationPrefsChain({
      data: [
        { key: NOTIFICATION_SETTING_KEYS.push, value: "nope" },
        { key: NOTIFICATION_SETTING_KEYS.email, value: 1 },
      ],
      error: null,
    });
    await expect(fetchNotificationPreferences(client, "u1")).resolves.toEqual({
      pushEnabled: true,
      emailEnabled: true,
    });
  });

  it("upsertNotificationPreferences throws when a row fails", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "write failed" } });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as Client;

    await expect(
      upsertNotificationPreferences(client, "u1", { pushEnabled: true, emailEnabled: true }),
    ).rejects.toThrow("Database error");
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("saveNotificationPreferencesFromInput validates input", async () => {
    const client = { from: vi.fn() } as unknown as Client;
    await expect(saveNotificationPreferencesFromInput(client, "u1", {})).rejects.toThrow(
      NOTIFICATION_UI.toastValidationError,
    );
    expect(client.from).not.toHaveBeenCalled();
  });

  it("saveNotificationPreferencesFromInput persists valid payload", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as Client;

    const out = await saveNotificationPreferencesFromInput(client, "u1", {
      pushEnabled: false,
      emailEnabled: true,
    });
    expect(out).toEqual({ pushEnabled: false, emailEnabled: true });
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("fetchTrashBinPreference throws on error", async () => {
    const client = trashBinChain({ data: null, error: { message: "nope" } });
    await expect(fetchTrashBinPreference(client, "u1")).rejects.toThrow("Database error");
  });

  it("fetchTrashBinPreference defaults when row missing", async () => {
    const client = trashBinChain({ data: null, error: null });
    await expect(fetchTrashBinPreference(client, "u1")).resolves.toEqual({ trashBinEnabled: true });
  });

  it("fetchTrashBinPreference reads stored boolean", async () => {
    const client = trashBinChain({ data: { value: false }, error: null });
    await expect(fetchTrashBinPreference(client, "u1")).resolves.toEqual({ trashBinEnabled: false });
  });

  it("upsertTrashBinPreference throws on error", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "fail" } });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as Client;
    await expect(upsertTrashBinPreference(client, "u1", { trashBinEnabled: false })).rejects.toThrow(
      "Database error",
    );
  });

  it("saveTrashBinPreferenceFromInput validates", async () => {
    const client = { from: vi.fn() } as unknown as Client;
    await expect(saveTrashBinPreferenceFromInput(client, "u1", {})).rejects.toThrow(
      TRASH_BIN_UI.toastValidationError,
    );
  });

  it("saveTrashBinPreferenceFromInput upserts valid state", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as Client;
    const out = await saveTrashBinPreferenceFromInput(client, "u1", { trashBinEnabled: false });
    expect(out).toEqual({ trashBinEnabled: false });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
