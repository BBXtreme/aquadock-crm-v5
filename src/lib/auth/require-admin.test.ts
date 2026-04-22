import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("./require-user", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

describe("requireAdmin", () => {
  beforeEach(() => {
    mockRequireUser.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it("redirects to unauthorized when user is not admin", async () => {
    mockRequireUser.mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      user_metadata: {},
      role: "user",
      display_name: null,
      avatar_url: null,
    });
    const { requireAdmin } = await import("./require-admin");
    await expect(requireAdmin()).rejects.toThrow("redirect:/unauthorized");
    expect(mockRedirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("returns the user when admin", async () => {
    const admin = {
      id: "a1",
      email: "admin@b.c",
      user_metadata: {},
      role: "admin" as const,
      display_name: null,
      avatar_url: null,
    };
    mockRequireUser.mockResolvedValue(admin);
    const { requireAdmin } = await import("./require-admin");
    await expect(requireAdmin()).resolves.toEqual(admin);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
