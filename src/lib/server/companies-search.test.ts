import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchCompaniesListInput } from "./companies-search";
import { searchCompaniesList } from "./companies-search";

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
    mockBuildCompaniesFilterApplier.mockResolvedValue(applyFilters);

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
    expect(result.companies).toEqual([
      {
        id: "c1",
        firmenname: "AquaDock Marina Hotel",
        contacts: [{ id: "ct1", deleted_at: null }],
      },
    ]);
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
    mockBuildCompaniesFilterApplier.mockResolvedValue((q: unknown) => q);

    await expect(searchCompaniesList(makeInput({ sorting: [] }))).rejects.toThrow("query failed");
    expect(query.order).not.toHaveBeenCalled();
  });
});
