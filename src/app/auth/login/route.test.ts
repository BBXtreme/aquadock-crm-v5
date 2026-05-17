import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignIn = vi.hoisted(() => vi.fn());
const mockGetContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  }),
}));

vi.mock("@/lib/auth/get-crm-user-context", () => ({
  getCrmUserContext: (...args: unknown[]) => mockGetContext(...args),
}));

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeFormRequest(body: Record<string, string>): Request {
  const params = new URLSearchParams(body);
  return new Request("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

describe("POST /auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSignIn.mockReset();
    mockGetContext.mockReset();
  });

  it("returns 400 when JSON payload is missing fields", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeJsonRequest({ email: "" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("validation_error");
  });

  it("returns 401 for invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const { POST } = await import("./route");
    const res = await POST(
      makeJsonRequest({
        email: "user@example.com",
        password: "wrong-but-long-enough",
      }) as never,
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      code: "invalid_credentials",
      message: expect.any(String),
    });
  });

  it("returns partner redirect for partner-only users", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockGetContext.mockResolvedValue({
      user: { id: "u1", roles: ["partner"] },
      pendingStatus: null,
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeJsonRequest({
        email: "partner@example.com",
        password: "long-enough-pw",
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, redirectTo: "/partner/dashboard" });
  });

  it("returns dashboard redirect for internal users", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockGetContext.mockResolvedValue({
      user: { id: "u2", roles: ["admin"] },
      pendingStatus: null,
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeJsonRequest({
        email: "admin@example.com",
        password: "long-enough-pw",
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, redirectTo: "/dashboard" });
  });

  it("accepts FormData payload and honors safe redirectTo", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockGetContext.mockResolvedValue({
      user: { id: "u3", roles: ["user"] },
      pendingStatus: null,
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeFormRequest({
        email: "user@example.com",
        password: "long-enough-pw",
        redirectTo: "/companies",
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redirectTo).toBe("/companies");
  });

  it("returns 415 for unsupported content type", async () => {
    const req = new Request("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "noop",
    });
    const { POST } = await import("./route");
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });
});
