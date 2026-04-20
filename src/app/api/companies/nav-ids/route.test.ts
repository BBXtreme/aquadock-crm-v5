import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockFetchIds = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/companies/companies-list-supabase", () => ({
  fetchAllCompanyIdsForListNavigation: (...args: unknown[]) => mockFetchIds(...args),
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/companies/nav-ids", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/companies/nav-ids", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockFetchIds.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await POST(makeRequest({ searchParams: "" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockFetchIds).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing searchParams", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });

    const res = await POST(makeRequest({ foo: "bar" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
    expect(mockFetchIds).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });

    const req = new Request("http://localhost/api/companies/nav-ids", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockFetchIds).not.toHaveBeenCalled();
  });

  it("delegates to fetchAllCompanyIdsForListNavigation with parsed list state", async () => {
    const supabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    mockCreateServer.mockResolvedValue(supabaseClient);
    mockFetchIds.mockResolvedValue(["id-a", "id-b"]);

    const res = await POST(makeRequest({ searchParams: "q=marina" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ids: ["id-a", "id-b"] });
    expect(mockFetchIds).toHaveBeenCalledTimes(1);
    const [supaArg, stateArg] = mockFetchIds.mock.calls[0] as [unknown, { globalFilter: string }];
    expect(supaArg).toBe(supabaseClient);
    expect(stateArg.globalFilter).toBe("marina");
  });

  it("returns 500 on unexpected errors", async () => {
    mockCreateServer.mockRejectedValue(new Error("db unavailable"));

    const res = await POST(makeRequest({ searchParams: "" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db unavailable" });
  });
});
