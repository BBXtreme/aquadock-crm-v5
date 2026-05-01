import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClaims = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getClaims: (...args: unknown[]) => mockGetClaims(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

describe("getCrmUserContext", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetClaims.mockReset();
    mockGetUser.mockReset();
    mockRpc.mockReset();
  });

  it("returns null user when no JWT cookie is present (logged-out)", async () => {
    mockGetClaims.mockResolvedValue({ data: null, error: null });

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(ctx).toEqual({ user: null, pendingStatus: null });
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("derives user from claims and merges profile + pending status (happy path)", async () => {
    mockGetClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "user-1",
          email: "u@example.com",
          user_metadata: { display_name: "Alice" },
        },
      },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          profile_role: "admin",
          display_name: "Alice Admin",
          avatar_url: "https://cdn/x.png",
          profile_exists: true,
          pending_status: null,
        },
      ],
      error: null,
    });

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith("get_crm_user_context");
    expect(ctx).toEqual({
      user: {
        id: "user-1",
        email: "u@example.com",
        user_metadata: { display_name: "Alice" },
        role: "admin",
        display_name: "Alice Admin",
        avatar_url: "https://cdn/x.png",
      },
      pendingStatus: null,
    });
  });

  it("falls back to getUser when claims are invalid/expired", async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "expired", status: 401 },
    });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "v@example.com",
          user_metadata: {},
        },
      },
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          profile_role: "user",
          display_name: null,
          avatar_url: null,
          profile_exists: true,
          pending_status: "pending_review",
        },
      ],
      error: null,
    });

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(ctx.user?.id).toBe("user-2");
    expect(ctx.user?.role).toBe("user");
    expect(ctx.pendingStatus).toBe("pending_review");
  });

  it("returns null user when claims invalid AND getUser also returns no user", async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "expired", status: 401 },
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(ctx).toEqual({ user: null, pendingStatus: null });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("defaults role to 'user' when no profile row exists yet", async () => {
    mockGetClaims.mockResolvedValue({
      data: {
        claims: { sub: "user-3", email: "w@example.com", user_metadata: {} },
      },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          profile_role: null,
          display_name: null,
          avatar_url: null,
          profile_exists: false,
          pending_status: "accepted",
        },
      ],
      error: null,
    });

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(ctx.user?.role).toBe("user");
    expect(ctx.pendingStatus).toBe("accepted");
  });

  it("degrades gracefully when the RPC fails (still returns user + null pending)", async () => {
    mockGetClaims.mockResolvedValue({
      data: {
        claims: { sub: "user-4", email: "x@example.com", user_metadata: {} },
      },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rpc down" },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { getCrmUserContext } = await import("./get-crm-user-context");
    const ctx = await getCrmUserContext();

    expect(ctx.user?.id).toBe("user-4");
    expect(ctx.user?.role).toBe("user");
    expect(ctx.pendingStatus).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
