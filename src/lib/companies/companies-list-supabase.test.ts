import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CompaniesListUrlState,
  defaultCompaniesListUrlState,
} from "@/lib/utils/company-filters-url-state";
import type { Database } from "@/types/database.types";
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

/** Supabase stub for `buildCompaniesFilterApplier` lexical merge (`from().select('id').…limit()`). */
function makeSupabaseForHybridLexicalMerge(lexicalRows: { id: string }[] = []) {
  const q = {
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: lexicalRows, error: null }),
  };
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => q),
    })),
  } as unknown as SupabaseClient<Database>;
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
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
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

  it("applyCompaniesListFiltersToCompaniesQuery applies every facet filter column", () => {
    const query = makeQueryBuilder();
    const filters: CompaniesListFilterSlice = {
      globalFilter: "x",
      activeFilters: {
        status: ["lead"],
        kategorie: ["kt-a"],
        betriebstyp: ["ft-b"],
        land: ["DE"],
        wassertyp: ["salt"],
      },
      waterFilter: null,
    };

    applyCompaniesListFiltersToCompaniesQuery(query, filters);

    expect(query.in).toHaveBeenCalledWith("status", ["lead"]);
    expect(query.in).toHaveBeenCalledWith("kundentyp", ["kt-a"]);
    expect(query.in).toHaveBeenCalledWith("firmentyp", ["ft-b"]);
    expect(query.in).toHaveBeenCalledWith("land", ["DE"]);
    expect(query.in).toHaveBeenCalledWith("wassertyp", ["salt"]);
  });

  it.each([
    ["at", "eq", ["wasserdistanz", 0]] as const,
    ["le100", "lte", ["wasserdistanz", 100]] as const,
    ["le500", "lte", ["wasserdistanz", 500]] as const,
    ["le1km", "lte", ["wasserdistanz", 1000]] as const,
    ["gt1km", "gt", ["wasserdistanz", 1000]] as const,
  ])("applyCompaniesListFiltersToCompaniesQuery applies water preset %s", (preset, method, args) => {
    const query = makeQueryBuilder();
    const filters = { ...makeFilterSlice(), waterFilter: preset };
    applyCompaniesListFiltersToCompaniesQuery(query, filters);
    const spy = query[method as keyof typeof query] as ReturnType<typeof vi.fn>;
    expect(spy).toHaveBeenCalledWith(...args);
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
    const supabase = makeSupabaseForHybridLexicalMerge([]);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "id-1" }, { companyId: "id-2" }]);

    const { applyFilters, globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
      supabase,
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

  it("buildCompaniesFilterApplier warns and uses hybrid-only ranked ids when lexical merge query fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const filters = makeFilterSlice("lex-error");
    const query = makeQueryBuilder();
    const q = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "lexical query failed" } }),
    };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => q),
      })),
    } as unknown as SupabaseClient<Database>;

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "hyb-only" }]);

    const { applyFilters, rankedIds } = await buildCompaniesFilterApplier(supabase, filters);
    expect(rankedIds).toEqual(["hyb-only"]);
    applyFilters(query);
    expect(query.in).toHaveBeenCalledWith("id", ["hyb-only"]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[companies-list-supabase] Lexical merge query failed:",
      "lexical query failed",
    );
  });

  it("buildCompaniesFilterApplier caps merged hybrid + lexical ranked ids at 1500", async () => {
    const filters = makeFilterSlice("cap-test");
    const query = makeQueryBuilder();
    const hybridHits = Array.from({ length: 1000 }, (_, i) => ({ companyId: `h-${i}` }));
    const lexicalRows = Array.from({ length: 600 }, (_, i) => ({ id: `l-${i}` }));
    const supabase = makeSupabaseForHybridLexicalMerge(lexicalRows);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue(hybridHits);

    const { applyFilters, rankedIds } = await buildCompaniesFilterApplier(supabase, filters);
    expect(rankedIds).toHaveLength(1500);
    expect(rankedIds?.[999]).toBe("h-999");
    expect(rankedIds?.[1000]).toBe("l-0");
    expect(rankedIds?.[1499]).toBe("l-499");
    expect(rankedIds).not.toContain("l-500");

    applyFilters(query);
    expect(query.in).toHaveBeenCalledWith(
      "id",
      expect.arrayContaining(["h-0", "h-999", "l-0", "l-499"]),
    );
    const idCall = query.in.mock.calls.find((c) => c[0] === "id");
    expect(idCall?.[1]).toHaveLength(1500);
  });

  it("buildCompaniesFilterApplier appends lexical-only ids when hybrid misses a row", async () => {
    const filters = makeFilterSlice("neu import");
    const query = makeQueryBuilder();
    const supabase = makeSupabaseForHybridLexicalMerge([{ id: "id-lex" }]);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "id-1" }]);

    const { applyFilters, globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
      supabase,
      filters,
    );
    expect(globalSearchStrategy).toBe("hybrid");
    expect(rankedIds).toEqual(["id-1", "id-lex"]);
    applyFilters(query);
    expect(query.in).toHaveBeenCalledWith("id", ["id-1", "id-lex"]);
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

  it("buildCompaniesFilterApplier uses empty-result sentinel when hybrid and lexical return no ids", async () => {
    const filters = makeFilterSlice("harbor");
    const query = makeQueryBuilder();
    const supabase = makeSupabaseForHybridLexicalMerge([]);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([]);

    const { applyFilters, globalSearchStrategy } = await buildCompaniesFilterApplier(supabase, filters);
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
    ...defaultCompaniesListUrlState(),
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

  it("non-hybrid path skips order when sorting row is missing", async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [{ id: "solo" }], error: null }),
    };
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(queryChain) })),
    } as never;

    const ids = await fetchAllCompanyIdsForListNavigation(supabase, makeListState({ sorting: [] }));

    expect(ids).toEqual(["solo"]);
    expect(queryChain.order).not.toHaveBeenCalled();
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

    const lexicalChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: survivors, error: null }),
    };
    let fromCalls = 0;
    const supabase = {
      from: vi.fn(() => {
        fromCalls += 1;
        if (fromCalls === 1) {
          return { select: vi.fn().mockReturnValue(lexicalChain) };
        }
        return { select: vi.fn().mockReturnValue(queryChain) };
      }),
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

  it("hybrid path propagates Supabase errors from intersection chunked reads", async () => {
    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2]);
    mockHybridCompanySearch.mockResolvedValue([{ companyId: "id-1" }]);

    const lexicalChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: "lex-1" }], error: null }),
    };
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error("range failed") }),
    };
    let fromCalls = 0;
    const supabase = {
      from: vi.fn(() => {
        fromCalls += 1;
        if (fromCalls === 1) {
          return { select: vi.fn().mockReturnValue(lexicalChain) };
        }
        return { select: vi.fn().mockReturnValue(queryChain) };
      }),
    } as never;

    await expect(
      fetchAllCompanyIdsForListNavigation(supabase, makeListState({ globalFilter: "query", sorting: [] })),
    ).rejects.toThrow("range failed");
  });

  it("hybrid path short-circuits when hybrid and lexical both return no ids", async () => {
    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2]);
    mockHybridCompanySearch.mockResolvedValue([]);

    const lexicalChain = {
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const from = vi.fn(() => ({ select: vi.fn().mockReturnValue(lexicalChain) }));
    const supabase = { from } as never;

    const ids = await fetchAllCompanyIdsForListNavigation(
      supabase,
      makeListState({ globalFilter: "nothing matches" }),
    );

    expect(ids).toEqual([]);
    expect(from).toHaveBeenCalled();
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
