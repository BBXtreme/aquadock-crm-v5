import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

const mockFrom = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/constants/appearance-timezone-default", () => ({
  getDefaultAppearanceTimeZone: vi.fn(() => "Europe/Berlin"),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () =>
    ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    }) as unknown as Client,
}));

describe("user-settings appearance (createClient-backed)", () => {
  it("loadAppearanceSettings returns null when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { loadAppearanceSettings } = await import("./user-settings");
    await expect(loadAppearanceSettings()).resolves.toBeNull();
  });

  it("loadAppearanceSettings uses default time zone when none saved (window present)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { key: "appearance_theme", value: "dark" },
          { key: "appearance_locale", value: "de" },
          { key: "appearance_color_scheme", value: "emerald" },
          // intentionally omit appearance_timezone
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { loadAppearanceSettings } = await import("./user-settings");
    await expect(loadAppearanceSettings()).resolves.toEqual({
      theme: "dark",
      locale: "de",
      colorScheme: "emerald",
      timeZone: "Europe/Berlin",
    });
  });

  it("loadAppearanceSettings uses saved time zone when present and valid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { key: "appearance_timezone", value: "UTC" },
          { key: "appearance_theme", value: "system" },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { loadAppearanceSettings } = await import("./user-settings");
    await expect(loadAppearanceSettings()).resolves.toEqual({
      theme: "system",
      locale: "de",
      colorScheme: "teal",
      timeZone: "UTC",
    });
  });

  it("upsertUserSetting throws when user_id is missing", async () => {
    const { upsertUserSetting } = await import("./user-settings");
    await expect(
      upsertUserSetting({ user_id: null, key: "k", value: null } as never),
    ).rejects.toThrow(/User ID is required/);
  });
});

