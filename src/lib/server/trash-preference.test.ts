import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchTrashBinPreference = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/user-settings", () => ({
  fetchTrashBinPreference,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";

describe("getTrashBinEnabledForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTrashBinPreference.mockResolvedValue({ trashBinEnabled: false });
  });

  it("returns true when auth returns an error", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "session missing" },
        }),
      },
    } as never);

    const { getTrashBinEnabledForCurrentUser } = await import("./trash-preference");
    await expect(getTrashBinEnabledForCurrentUser()).resolves.toBe(true);
    expect(fetchTrashBinPreference).not.toHaveBeenCalled();
  });

  it("returns true when there is no user", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const { getTrashBinEnabledForCurrentUser } = await import("./trash-preference");
    await expect(getTrashBinEnabledForCurrentUser()).resolves.toBe(true);
    expect(fetchTrashBinPreference).not.toHaveBeenCalled();
  });

  it("returns fetchTrashBinPreference when session is valid", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    } as never);
    fetchTrashBinPreference.mockResolvedValue({ trashBinEnabled: true });

    const { getTrashBinEnabledForCurrentUser } = await import("./trash-preference");
    await expect(getTrashBinEnabledForCurrentUser()).resolves.toBe(true);
    expect(fetchTrashBinPreference).toHaveBeenCalledTimes(1);
    const client = await createServerSupabaseClient.mock.results[0]?.value;
    expect(fetchTrashBinPreference).toHaveBeenCalledWith(client, USER_ID);
  });
});
