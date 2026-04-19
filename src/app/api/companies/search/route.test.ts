import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockSearchCompaniesList = vi.hoisted(() => vi.fn());
const mockSafeParse = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/server/companies-search", () => ({
  searchCompaniesList: (...args: unknown[]) => mockSearchCompaniesList(...args),
  searchCompaniesListInputSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}));

describe("POST /api/companies/search", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockSearchCompaniesList.mockReset();
    mockSafeParse.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new Request("http://localhost/api/companies/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when request body is invalid", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockSafeParse.mockReturnValue({
      success: false,
      error: {
        flatten: () => ({ fieldErrors: { globalFilter: ["required"] } }),
      },
    });

    const req = new Request("http://localhost/api/companies/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bad: true }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(mockSearchCompaniesList).not.toHaveBeenCalled();
  });

  it("returns search result payload for valid requests", async () => {
    const parsed = {
      globalFilter: "marina",
      activeFilters: { status: [], kategorie: [], betriebstyp: [], land: [], wassertyp: [] },
      waterFilter: null,
      sorting: [{ id: "firmenname", desc: false }],
      pagination: { pageIndex: 0, pageSize: 20 },
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockSafeParse.mockReturnValue({ success: true, data: parsed });
    mockSearchCompaniesList.mockResolvedValue({
      companies: [{ id: "c1", firmenname: "Marina Hotel" }],
      totalCount: 1,
    });

    const req = new Request("http://localhost/api/companies/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSearchCompaniesList).toHaveBeenCalledWith(parsed);
    expect(await res.json()).toEqual({
      companies: [{ id: "c1", firmenname: "Marina Hotel" }],
      totalCount: 1,
    });
  });

  it("returns 500 on unexpected errors", async () => {
    mockCreateServer.mockRejectedValue(new Error("db unavailable"));

    const req = new Request("http://localhost/api/companies/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db unavailable" });
  });
});
