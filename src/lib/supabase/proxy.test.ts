import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClaims = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockCreateServerClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const mockCookieSet = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => ({ type: "next-response", cookies: { set: mockCookieSet } }),
  },
}));

const ORIGINAL_ENV = { ...process.env };

function buildRequest() {
  return {
    headers: new Headers(),
    cookies: { getAll: () => [] },
  } as unknown as import("next/server").NextRequest;
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetClaims.mockReset();
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockCreateServerClient.mockReset();
    mockCookieSet.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
  });

  it("uses getClaims() on the happy path and never calls getUser/getSession", async () => {
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, _options: unknown) => ({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    }));
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "u1" }, header: {}, signature: new Uint8Array() },
      error: null,
    });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(true);
    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("returns hasSession=false without an extra Auth call when there is no JWT", async () => {
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, _options: unknown) => ({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    }));
    mockGetClaims.mockResolvedValue({ data: null, error: null });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("falls back to getUser() (refresh path) when claims are invalid/expired", async () => {
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, _options: unknown) => ({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    }));
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "expired", status: 401 },
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(true);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("returns hasSession=false when the fallback getUser also reports no user", async () => {
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, _options: unknown) => ({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    }));
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "expired", status: 401 },
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(false);
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("throws when Supabase env vars are missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, _options: unknown) => ({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    }));
    const { updateSession } = await import("./proxy");
    await expect(updateSession(buildRequest())).rejects.toThrow(/Supabase environment variables/);
  });

  it("exposes a cookie sink that writes via response.cookies.set for each cookie", async () => {
    let capturedCookies: null | { setAll: (cookiesToSet: unknown[]) => void } = null;
    mockCreateServerClient.mockImplementation((_url: unknown, _anonKey: unknown, options: unknown) => {
      capturedCookies = (options as { cookies?: { setAll: (cookiesToSet: unknown[]) => void } }).cookies ?? null;
      return {
        auth: {
          getClaims: mockGetClaims,
          getUser: mockGetUser,
          getSession: mockGetSession,
        },
      };
    });
    mockGetClaims.mockResolvedValue({ data: null, error: null });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(false);
    const cookies = capturedCookies as unknown as null | { setAll: (cookiesToSet: unknown[]) => void };
    if (!cookies) {
      throw new Error("capturedCookies unexpectedly null");
    }

    cookies.setAll([
      { name: "sb-access-token", value: "v1", options: { path: "/", httpOnly: true } },
      { name: "sb-refresh-token", value: "v2", options: { path: "/", httpOnly: true } },
    ]);

    expect(mockCookieSet).toHaveBeenCalledTimes(2);
    expect(mockCookieSet).toHaveBeenCalledWith("sb-access-token", "v1", { path: "/", httpOnly: true });
    expect(mockCookieSet).toHaveBeenCalledWith("sb-refresh-token", "v2", { path: "/", httpOnly: true });
  });
});
