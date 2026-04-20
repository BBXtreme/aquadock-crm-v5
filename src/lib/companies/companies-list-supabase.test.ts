import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompaniesListUrlState } from "@/lib/utils/company-filters-url-state";
import type { CompaniesListFilterSlice } from "./companies-list-supabase";
import {
  applyCompaniesListFiltersToCompaniesQuery,
  buildCompaniesFilterApplier,
  fetchAllCompanyIdsForListNavigation,
} from "./companies-list-supabase";

const mockCreateCompanySearchEmbedding = vi.hoisted(() => vi.fn());
const mockHybridCompanySearch = vi.hoisted(() => vi.fn());
const mockResolveSemanticSearchSettings = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/semantic-search", () => ({
  createCompanySearchEmbedding: (...args: unknown[]) => mockCreateCompanySearchEmbedding(...args),
  hybridCompanySearch: (...args: unknown[]) => mockHybridCompanySearch(...args),
  resolveSemanticSearchSettings: (...args: unknown[]) => mockResolveSemanticSearchSettings(...args),
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

function lexicalOrClause(g: string): string {
  return [
    `firmenname.ilike.%${g}%`,
    `kundentyp.ilike.%${g}%`,
    `firmentyp.ilike.%${g}%`,
    `rechtsform.ilike.%${g}%`,
    `strasse.ilike.%${g}%`,
    `plz.ilike.%${g}%`,
    `stadt.ilike.%${g}%`,
    `bundesland.ilike.%${g}%`,
    `land.ilike.%${g}%`,
    `notes.ilike.%${g}%`,
    `website.ilike.%${g}%`,
    `email.ilike.%${g}%`,
    `telefon.ilike.%${g}%`,
    `status.ilike.%${g}%`,
    `wassertyp.ilike.%${g}%`,
  ].join(",");
}

describe("companies-list-supabase hybrid applier", () => {
  beforeEach(() => {
    mockCreateCompanySearchEmbedding.mockReset();
    mockHybridCompanySearch.mockReset();
    mockResolveSemanticSearchSettings.mockReset();
    mockResolveSemanticSearchSettings.mockResolvedValue({
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      semanticSearchEnabled: true,
      autoBackfillEmbeddings: true,
      showSemanticBadge: true,
    });
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
    expect(query.or).toHaveBeenCalledWith(lexicalOrClause("marina"));
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

    const { applyFilters, globalSearchStrategy } = await buildCompaniesFilterApplier({} as never, filters);
    expect(globalSearchStrategy).toBe("none");
    const out = applyFilters(query);

    expect(out).toBe(query);
    expect(mockCreateCompanySearchEmbedding).not.toHaveBeenCalled();
    expect(mockHybridCompanySearch).not.toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith("status", ["lead"]);
    expect(query.lte).toHaveBeenCalledWith("wasserdistanz", 100);
  });

  it("buildCompaniesFilterApplier applies ranked id filter on hybrid success", async () => {
    const filters = makeFilterSlice(" marina ");
    const query = makeQueryBuilder();

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "id-1" }, { companyId: "id-2" }]);

    const { applyFilters, globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
      {} as never,
      filters,
    );
    expect(globalSearchStrategy).toBe("hybrid");
    expect(rankedIds).toEqual(["id-1", "id-2"]);
    applyFilters(query);

    expect(mockCreateCompanySearchEmbedding).toHaveBeenCalled();
    expect(mockHybridCompanySearch).toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith("id", ["id-1", "id-2"]);
    expect(query.or).not.toHaveBeenCalled();
  });

  it("buildCompaniesFilterApplier leaves rankedIds undefined on non-hybrid strategies", async () => {
    const filters = makeFilterSlice("dock");
    mockCreateCompanySearchEmbedding.mockRejectedValue(new Error("embedding down"));

    const { globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
      {} as never,
      filters,
    );
    expect(globalSearchStrategy).toBe("keyword_fallback");
    expect(rankedIds).toBeUndefined();
  });

  it("buildCompaniesFilterApplier uses empty-result sentinel when hybrid returns no ids", async () => {
    const filters = makeFilterSlice("harbor");
    const query = makeQueryBuilder();

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([]);

    const { applyFilters, globalSearchStrategy } = await buildCompaniesFilterApplier({} as never, filters);
    expect(globalSearchStrategy).toBe("hybrid");
    applyFilters(query);

    expect(query.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("buildCompaniesFilterApplier falls back to lexical filter when embedding fails", async () => {
    const filters = makeFilterSlice("dock");
    const query = makeQueryBuilder();

    mockCreateCompanySearchEmbedding.mockRejectedValue(new Error("embedding down"));

    const { applyFilters, globalSearchStrategy } = await buildCompaniesFilterApplier({} as never, filters);
    expect(globalSearchStrategy).toBe("keyword_fallback");
    applyFilters(query);

    expect(query.or).toHaveBeenCalledWith(lexicalOrClause("dock"));
    expect(query.in).not.toHaveBeenCalledWith("id", expect.anything());
  });

  it("buildCompaniesFilterApplier falls back to lexical filter when semantic search is disabled", async () => {
    const filters = makeFilterSlice("dock");
    const query = makeQueryBuilder();
    mockResolveSemanticSearchSettings.mockResolvedValue({
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      semanticSearchEnabled: false,
      autoBackfillEmbeddings: true,
      showSemanticBadge: true,
    });

    const { applyFilters, globalSearchStrategy } = await buildCompaniesFilterApplier({} as never, filters);
    expect(globalSearchStrategy).toBe("keyword_semantic_disabled");
    applyFilters(query);

    expect(mockCreateCompanySearchEmbedding).not.toHaveBeenCalled();
    expect(query.or).toHaveBeenCalledWith(lexicalOrClause("dock"));
  });
});

function makeListState(overrides: Partial<CompaniesListUrlState> = {}): CompaniesListUrlState {
  return {
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
    columnVisibility: {},
    ...overrides,
  };
}

// Pagination chunk size (`CHUNK`) inside `fetchAllCompanyIdsForListNavigation`.
const CHUNK = 1000;

describe("fetchAllCompanyIdsForListNavigation", () => {
  beforeEach(() => {
    mockCreateCompanySearchEmbedding.mockReset();
    mockHybridCompanySearch.mockReset();
    mockResolveSemanticSearchSettings.mockReset();
    mockResolveSemanticSearchSettings.mockResolvedValue({
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      semanticSearchEnabled: true,
      autoBackfillEmbeddings: true,
      showSemanticBadge: true,
    });
  });

  it("non-hybrid path applies column sort and pages through chunked ranges", async () => {
    const rangeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rangeData, error: null }),
    };
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(queryChain) })),
    } as never;

    const ids = await fetchAllCompanyIdsForListNavigation(
      supabase,
      makeListState({ sorting: [{ id: "status", desc: true }] }),
    );

    expect(ids).toEqual(["a", "b", "c"]);
    expect(queryChain.order).toHaveBeenCalledWith("status", { ascending: false });
    expect(queryChain.range).toHaveBeenCalledWith(0, CHUNK - 1);
  });

  it("hybrid path returns rankedIds filtered by surviving ids and preserves rank order", async () => {
    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2]);
    mockHybridCompanySearch.mockResolvedValue([
      { companyId: "id-1" },
      { companyId: "id-2" },
      { companyId: "id-3" },
      { companyId: "id-4" },
    ]);
    // Only id-1 and id-3 survive the non-global filter intersection.
    const survivors = [{ id: "id-3" }, { id: "id-1" }];

    const queryChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: survivors, error: null }),
    };
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(queryChain) })),
    } as never;

    const ids = await fetchAllCompanyIdsForListNavigation(
      supabase,
      makeListState({ globalFilter: "marina", sorting: [{ id: "status", desc: true }] }),
    );

    expect(ids).toEqual(["id-1", "id-3"]);
    // Column sort must be ignored in hybrid so the RRF rank order survives.
    expect(queryChain.order).not.toHaveBeenCalled();
    expect(queryChain.in).toHaveBeenCalledWith("id", ["id-1", "id-2", "id-3", "id-4"]);
  });

  it("hybrid path short-circuits when rankedIds is empty", async () => {
    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2]);
    mockHybridCompanySearch.mockResolvedValue([]);

    const from = vi.fn();
    const supabase = { from } as never;

    const ids = await fetchAllCompanyIdsForListNavigation(
      supabase,
      makeListState({ globalFilter: "nothing matches" }),
    );

    expect(ids).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("propagates Supabase errors from chunked reads", async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error("boom") }),
    };
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(queryChain) })),
    } as never;

    await expect(fetchAllCompanyIdsForListNavigation(supabase, makeListState())).rejects.toThrow(
      "boom",
    );
  });
});
