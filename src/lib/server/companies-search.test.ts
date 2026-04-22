import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchCompaniesListInput } from "./companies-search";
import { searchCompaniesList, searchCompaniesListInputSchema } from "./companies-search";

const mockCreateServerSupabaseClient = vi.hoisted(() => vi.fn());
const mockBuildCompaniesFilterApplier = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

vi.mock("@/lib/companies/companies-list-supabase", () => ({
  buildCompaniesFilterApplier: (...args: unknown[]) => mockBuildCompaniesFilterApplier(...args),
}));

function makeInput(overrides?: Partial<SearchCompaniesListInput>): SearchCompaniesListInput {
  return {
    globalFilter: "marina",
    activeFilters: {
      status: [],
      kategorie: [],
      betriebstyp: [],
      land: [],
      wassertyp: [],
    },
    waterFilter: null,
    sorting: [{ id: "adresse", desc: true }],
    pagination: { pageIndex: 2, pageSize: 25 },
    ...overrides,
  };
}

describe("searchCompaniesList", () => {
  beforeEach(() => {
    mockCreateServerSupabaseClient.mockReset();
    mockBuildCompaniesFilterApplier.mockReset();
  });

  it("applies filter applier, maps sort id, ranges correctly, and strips deleted contacts", async () => {
    const rows = [
      {
        id: "c1",
        firmenname: "AquaDock Marina Hotel",
        contacts: [
          { id: "ct1", deleted_at: null },
          { id: "ct2", deleted_at: "2026-01-01T10:00:00Z" },
        ],
      },
    ];

    const query = {
      order: vi.fn(),
      range: vi.fn(),
    };
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      data: rows,
      error: null,
      count: 71,
    });

    const baseQuery = {
      select: vi.fn().mockReturnValue(query),
    };

    const supabase = {
      from: vi.fn(() => baseQuery),
    };

    const applyFilters = vi.fn((q: unknown) => q);

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters,
      globalSearchStrategy: "hybrid",
    });

    const result = await searchCompaniesList(makeInput());

    expect(mockBuildCompaniesFilterApplier).toHaveBeenCalledWith(supabase, {
      globalFilter: "marina",
      activeFilters: {
        status: [],
        kategorie: [],
        betriebstyp: [],
        land: [],
        wassertyp: [],
      },
      waterFilter: null,
    });
    expect(applyFilters).toHaveBeenCalledWith(query);
    expect(query.order).toHaveBeenCalledWith("stadt", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(50, 74);
    expect(result.totalCount).toBe(71);
    expect(result.globalSearchStrategy).toBe("hybrid");
    expect(result.companies).toEqual([
      {
        id: "c1",
        firmenname: "AquaDock Marina Hotel",
        contacts: [{ id: "ct1", deleted_at: null }],
        owner_profile: null,
      },
    ]);
  });

  it("hybrid path orders the page by RRF rank and paginates in memory", async () => {
    const rows = [
      { id: "c3", firmenname: "Third match", contacts: [] },
      { id: "c1", firmenname: "First match", contacts: [] },
      { id: "c2", firmenname: "Second match", contacts: [{ id: "ct", deleted_at: null }] },
    ];

    const filteredQuery = {
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const baseQuery = {
      select: vi.fn().mockReturnValue(filteredQuery),
    };

    const supabase = {
      from: vi.fn(() => baseQuery),
    };

    const applyFilters = vi.fn((q: unknown) => q);

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters,
      globalSearchStrategy: "hybrid",
      rankedIds: ["c1", "c2", "c3"],
    });

    const result = await searchCompaniesList(
      makeInput({
        sorting: [{ id: "firmenname", desc: false }],
        pagination: { pageIndex: 0, pageSize: 2 },
      }),
    );

    expect(applyFilters).toHaveBeenCalledWith(filteredQuery);
    expect(filteredQuery.limit).toHaveBeenCalledWith(3);
    expect(result.totalCount).toBe(3);
    expect(result.globalSearchStrategy).toBe("hybrid");
    expect(result.companies.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("hybrid path honours user column sort when sortExplicit is true", async () => {
    const rows = [
      { id: "c3", firmenname: "Charlie", contacts: [] },
      { id: "c1", firmenname: "Alpha", contacts: [] },
      { id: "c2", firmenname: "Bravo", contacts: [] },
    ];

    const filteredQuery = {
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(filteredQuery) })),
    };

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters: (q: unknown) => q,
      globalSearchStrategy: "hybrid",
      rankedIds: ["c1", "c2", "c3"],
    });

    const result = await searchCompaniesList(
      makeInput({
        sorting: [{ id: "firmenname", desc: false }],
        sortExplicit: true,
        pagination: { pageIndex: 0, pageSize: 10 },
      }),
    );

    expect(result.companies.map((c) => c.firmenname)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("hybrid path slices a later page by RRF rank", async () => {
    const rows = [
      { id: "c1", firmenname: "one", contacts: [] },
      { id: "c2", firmenname: "two", contacts: [] },
      { id: "c3", firmenname: "three", contacts: [] },
    ];

    const filteredQuery = {
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(filteredQuery) })),
    };

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters: (q: unknown) => q,
      globalSearchStrategy: "hybrid",
      rankedIds: ["c1", "c2", "c3"],
    });

    const result = await searchCompaniesList(
      makeInput({
        sorting: [],
        pagination: { pageIndex: 1, pageSize: 2 },
      }),
    );

    expect(result.companies.map((c) => c.id)).toEqual(["c3"]);
    expect(result.totalCount).toBe(3);
  });

  it("hybrid path short-circuits when ranked ids are empty", async () => {
    const supabase = { from: vi.fn() };

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters: (q: unknown) => q,
      globalSearchStrategy: "hybrid",
      rankedIds: [],
    });

    const result = await searchCompaniesList(makeInput());

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual({
      companies: [],
      totalCount: 0,
      globalSearchStrategy: "hybrid",
    });
  });

  it("throws when Supabase query returns an error", async () => {
    const query = {
      order: vi.fn(),
      range: vi.fn(),
    };
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      data: null,
      error: new Error("query failed"),
      count: null,
    });

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue(query),
      })),
    };

    mockCreateServerSupabaseClient.mockResolvedValue(supabase);
    mockBuildCompaniesFilterApplier.mockResolvedValue({
      applyFilters: (q: unknown) => q,
      globalSearchStrategy: "none",
    });

    await expect(searchCompaniesList(makeInput({ sorting: [] }))).rejects.toThrow("query failed");
    expect(query.order).not.toHaveBeenCalled();
  });
});

describe("searchCompaniesListInputSchema", () => {
  const baseInput = {
    globalFilter: "",
    activeFilters: {
      status: [],
      kategorie: [],
      betriebstyp: [],
      land: [],
      wassertyp: [],
    },
    waterFilter: null,
    sorting: [{ id: "firmenname", desc: false }],
    pagination: { pageIndex: 0, pageSize: 20 },
  };

  it("accepts input without sortExplicit (backwards compatible)", () => {
    const result = searchCompaniesListInputSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortExplicit).toBeUndefined();
    }
  });

  it("accepts sortExplicit: true", () => {
    const result = searchCompaniesListInputSchema.safeParse({ ...baseInput, sortExplicit: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortExplicit).toBe(true);
    }
  });

  it("rejects non-boolean sortExplicit", () => {
    const result = searchCompaniesListInputSchema.safeParse({ ...baseInput, sortExplicit: "yes" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown waterFilter values", () => {
    const result = searchCompaniesListInputSchema.safeParse({ ...baseInput, waterFilter: "banana" });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize above the 500 cap", () => {
    const result = searchCompaniesListInputSchema.safeParse({
      ...baseInput,
      pagination: { pageIndex: 0, pageSize: 10_000 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative pageIndex", () => {
    const result = searchCompaniesListInputSchema.safeParse({
      ...baseInput,
      pagination: { pageIndex: -1, pageSize: 20 },
    });
    expect(result.success).toBe(false);
  });
});
