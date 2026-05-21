/**
 * Phase 2 §4.2 — generation-token invalidation for the ranked-IDs cache.
 *
 * Validates that `buildCompaniesFilterApplier` treats a cached ranked-IDs
 * entry as stale when the per-process generation counter has been bumped
 * since the entry was written. Same-instance company writes therefore
 * propagate to subsequent search/nav-ids calls deterministically.
 *
 * The 90 s TTL remains the cross-instance safety net (covered by the
 * existing cache TTL behaviour); this suite focuses purely on the bump path.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bumpCompaniesGeneration,
  resetCompaniesGenerationForTests,
} from "@/lib/companies/companies-hot-path";
import type { Database } from "@/types/database.types";

import {
  buildCompaniesFilterApplier,
  type CompaniesListFilterSlice,
  clearHybridRankedIdsCacheForTests,
} from "./companies-list-supabase";

const mockCreateCompanySearchEmbedding = vi.hoisted(() => vi.fn());
const mockHybridCompanySearch = vi.hoisted(() => vi.fn());
const mockResolveSemanticSearchSettings = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/semantic-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/semantic-search")>();
  return {
    ...actual,
    createCompanySearchEmbedding: (...args: unknown[]) => mockCreateCompanySearchEmbedding(...args),
    hybridCompanySearch: (...args: unknown[]) => mockHybridCompanySearch(...args),
    resolveSemanticSearchSettings: (...args: unknown[]) => mockResolveSemanticSearchSettings(...args),
  };
});

function makeFilterSlice(globalFilter: string): CompaniesListFilterSlice {
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

function makeSupabaseStub(lexicalRows: { id: string }[] = []) {
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

describe("ranked-ids cache: generation-token invalidation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    clearHybridRankedIdsCacheForTests();
    resetCompaniesGenerationForTests();
    mockCreateCompanySearchEmbedding.mockReset();
    mockHybridCompanySearch.mockReset();
    mockResolveSemanticSearchSettings.mockReset();
    mockResolveSemanticSearchSettings.mockResolvedValue({
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      semanticSearchEnabled: true,
      autoBackfillEmbeddings: true,
      showSemanticBadge: true,
      semanticMatchStrictness: "balanced",
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearHybridRankedIdsCacheForTests();
    resetCompaniesGenerationForTests();
  });

  it("returns cached rankedIds on second call when no bump occurred", async () => {
    const filters = makeFilterSlice("marina");
    const supabase = makeSupabaseStub([]);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch.mockResolvedValue([
      { companyId: "id-1" },
      { companyId: "id-2" },
    ]);

    const first = await buildCompaniesFilterApplier(supabase, filters);
    expect(first.rankedIds).toEqual(["id-1", "id-2"]);
    expect(mockHybridCompanySearch).toHaveBeenCalledTimes(1);

    const second = await buildCompaniesFilterApplier(supabase, filters);
    expect(second.rankedIds).toEqual(["id-1", "id-2"]);
    // Cache hit → no second embedding generation, no second hybrid RPC.
    expect(mockCreateCompanySearchEmbedding).toHaveBeenCalledTimes(1);
    expect(mockHybridCompanySearch).toHaveBeenCalledTimes(1);
  });

  it("recomputes when a write has bumped the generation counter", async () => {
    const filters = makeFilterSlice("marina");
    const supabase = makeSupabaseStub([]);

    mockCreateCompanySearchEmbedding.mockResolvedValue([1, 2, 3]);
    mockHybridCompanySearch
      .mockResolvedValueOnce([{ companyId: "id-1" }, { companyId: "id-2" }])
      .mockResolvedValueOnce([{ companyId: "id-3" }, { companyId: "id-4" }]);

    const first = await buildCompaniesFilterApplier(supabase, filters);
    expect(first.rankedIds).toEqual(["id-1", "id-2"]);
    expect(mockHybridCompanySearch).toHaveBeenCalledTimes(1);

    // Simulate a company write between the two reads.
    bumpCompaniesGeneration();

    const second = await buildCompaniesFilterApplier(supabase, filters);
    // Stale cache entry forced a recompute → new rankedIds visible.
    expect(second.rankedIds).toEqual(["id-3", "id-4"]);
    expect(mockHybridCompanySearch).toHaveBeenCalledTimes(2);
  });

});
