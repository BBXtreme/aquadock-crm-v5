import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

describe("requireUser", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it("redirects to login when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { requireUser } = await import("./require-user");
    await expect(requireUser()).rejects.toThrow("redirect:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns the user when authenticated", async () => {
    const user = {
      id: "u1",
      email: "a@b.c",
      user_metadata: {},
      role: "user" as const,
      display_name: null,
      avatar_url: null,
    };
    mockGetCurrentUser.mockResolvedValue(user);
    const { requireUser } = await import("./require-user");
    await expect(requireUser()).resolves.toEqual(user);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
