import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCrmUserContext = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("./get-crm-user-context", () => ({
  getCrmUserContext: (...args: unknown[]) => mockGetCrmUserContext(...args),
}));

const baseUser = {
  id: "u1",
  email: "u@example.com",
  user_metadata: {},
  role: "user" as const,
  display_name: null,
  avatar_url: null,
};

describe("requireCrmAccess", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCrmUserContext.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it("redirects to /login when no session", async () => {
    mockGetCrmUserContext.mockResolvedValue({ user: null, pendingStatus: null });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).rejects.toThrow("redirect:/login");
  });

  it("redirects to /access-pending on pending_email_confirmation", async () => {
    mockGetCrmUserContext.mockResolvedValue({
      user: baseUser,
      pendingStatus: "pending_email_confirmation",
    });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).rejects.toThrow("redirect:/access-pending");
  });

  it("redirects to /access-pending on pending_review", async () => {
    mockGetCrmUserContext.mockResolvedValue({
      user: baseUser,
      pendingStatus: "pending_review",
    });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).rejects.toThrow("redirect:/access-pending");
  });

  it("redirects to /access-denied on declined", async () => {
    mockGetCrmUserContext.mockResolvedValue({
      user: baseUser,
      pendingStatus: "declined",
    });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).rejects.toThrow("redirect:/access-denied");
  });

  it("returns the user for accepted pending status", async () => {
    mockGetCrmUserContext.mockResolvedValue({
      user: baseUser,
      pendingStatus: "accepted",
    });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).resolves.toEqual(baseUser);
  });

  it("returns the user when no pending row exists (null status)", async () => {
    mockGetCrmUserContext.mockResolvedValue({
      user: baseUser,
      pendingStatus: null,
    });
    const { requireCrmAccess } = await import("./require-crm-access");
    await expect(requireCrmAccess()).resolves.toEqual(baseUser);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
