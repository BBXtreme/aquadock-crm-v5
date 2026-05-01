import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClaims = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockCreateServerClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => mockCreateServerClient(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => ({ type: "next-response" }),
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
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    });
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
  });

  it("uses getClaims() on the happy path and never calls getUser/getSession", async () => {
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
    mockGetClaims.mockResolvedValue({ data: null, error: null });

    const { updateSession } = await import("./proxy");
    const result = await updateSession(buildRequest());

    expect(result.hasSession).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("falls back to getUser() (refresh path) when claims are invalid/expired", async () => {
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
    const { updateSession } = await import("./proxy");
    await expect(updateSession(buildRequest())).rejects.toThrow(/Supabase environment variables/);
  });
});
