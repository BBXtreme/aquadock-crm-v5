import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompaniesListFilterSlice } from "./companies-list-supabase";
import {
  applyCompaniesListFiltersToCompaniesQuery,
  buildCompaniesFilterApplier,
} from "./companies-list-supabase";

const mockCreateXaiEmbedding = vi.hoisted(() => vi.fn());
const mockHybridCompanySearch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/semantic-search", () => ({
  createXaiEmbedding: (...args: unknown[]) => mockCreateXaiEmbedding(...args),
  hybridCompanySearch: (...args: unknown[]) => mockHybridCompanySearch(...args),
}));

function makeFilterSlice(globalFilter = ""): CompaniesListFilterSlice {
  return {
    globalFilter,
    activeFilters: {
      status: [],
      kategorie: [],
      betriebstyp: [],
      land: [],
      wassertyp: [],
    },
    waterFilter: null,
  };
}

function makeQueryBuilder() {
  const query = {
    is: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    lte: vi.fn(),
    gt: vi.fn(),
    or: vi.fn(),
  };
  query.is.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.or.mockReturnValue(query);
  return query;
}

describe("companies-list-supabase hybrid applier", () => {
  beforeEach(() => {
    mockCreateXaiEmbedding.mockReset();
    mockHybridCompanySearch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applyCompaniesListFiltersToCompaniesQuery keeps lexical path behavior", () => {
    const filters = makeFilterSlice(" marina ");
    const query = makeQueryBuilder();

    const out = applyCompaniesListFiltersToCompaniesQuery(query, filters);

    expect(out).toBe(query);
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.or).toHaveBeenCalledWith("firmenname.ilike.%marina%,strasse.ilike.%marina%,stadt.ilike.%marina%");
  });

  it("buildCompaniesFilterApplier uses fast non-global path when search is empty", async () => {
    const filters = {
      ...makeFilterSlice("   "),
      activeFilters: {
        status: ["lead"],
        kategorie: [],
        betriebstyp: [],
        land: [],
        wassertyp: [],
      },
      waterFilter: "le100" as const,
    };
    const query = makeQueryBuilder();

    const applyFilters = await buildCompaniesFilterApplier({} as never, filters);
    const out = applyFilters(query);

    expect(out).toBe(query);
    expect(mockCreateXaiEmbedding).not.toHaveBeenCalled();
    expect(mockHybridCompanySearch).not.toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith("status", ["lead"]);
    expect(query.lte).toHaveBeenCalledWith("wasserdistanz", 100);
  });

  it("buildCompaniesFilterApplier applies ranked id filter on hybrid success", async () => {
    const filters = makeFilterSlice(" marina ");
    const query = makeQueryBuilder();

    mockCreateXaiEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "id-1" }, { companyId: "id-2" }]);

    const applyFilters = await buildCompaniesFilterApplier({} as never, filters);
    applyFilters(query);

    expect(mockCreateXaiEmbedding).toHaveBeenCalledWith({ text: "marina" });
    expect(mockHybridCompanySearch).toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith("id", ["id-1", "id-2"]);
    expect(query.or).not.toHaveBeenCalled();
  });

  it("buildCompaniesFilterApplier uses empty-result sentinel when hybrid returns no ids", async () => {
    const filters = makeFilterSlice("harbor");
    const query = makeQueryBuilder();

    mockCreateXaiEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([]);

    const applyFilters = await buildCompaniesFilterApplier({} as never, filters);
    applyFilters(query);

    expect(query.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("buildCompaniesFilterApplier falls back to lexical filter when embedding fails", async () => {
    const filters = makeFilterSlice("dock");
    const query = makeQueryBuilder();

    mockCreateXaiEmbedding.mockRejectedValue(new Error("xai down"));

    const applyFilters = await buildCompaniesFilterApplier({} as never, filters);
    applyFilters(query);

    expect(query.or).toHaveBeenCalledWith("firmenname.ilike.%dock%,strasse.ilike.%dock%,stadt.ilike.%dock%");
    expect(query.in).not.toHaveBeenCalledWith("id", expect.anything());
  });
});
