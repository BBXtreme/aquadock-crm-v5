/**
 * Shared Supabase query filters for the /companies list (same logic as `ClientCompaniesPage`).
 * Used for company-detail prev/next navigation over the filtered + sorted set.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCompanySearchEmbedding,
  hybridCompanySearch,
  resolveSemanticSearchSettings,
} from "@/lib/services/semantic-search";
import type { CompaniesListUrlState } from "@/lib/utils/company-filters-url-state";
import { companiesSortIdForQuery } from "@/lib/utils/company-filters-url-state";
import type { Database } from "@/types/database.types";

export type CompaniesListFilterSlice = Pick<CompaniesListUrlState, "globalFilter" | "activeFilters" | "waterFilter">;

/** How the list query resolved `globalFilter` (for subtle UI + debugging). */
export type CompaniesGlobalSearchStrategy =
  | "none"
  | "hybrid"
  | "keyword_semantic_disabled"
  | "keyword_fallback";

const CHUNK = 1000;
const HYBRID_MATCH_COUNT = 1000;
/** Cap merged hybrid + lexical id lists (PostgREST `.in()` size + client work). */
const HYBRID_LEXICAL_MERGED_ID_CAP = 1500;
const HYBRID_EMPTY_RESULT_SENTINEL = "00000000-0000-0000-0000-000000000000";

function applyLexicalGlobalFilter(
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
  query: any,
  globalFilter: string,
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
): any {
  const g = globalFilter.trim();
  if (g.length === 0) {
    return query;
  }
  // Keep in sync with fields users expect from “full text” + company form (ilike substrings).
  return query.or(
    [
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
    ].join(","),
  );
}

function applyNonGlobalCompaniesFilters(
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
  query: any,
  filters: CompaniesListFilterSlice,
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
): any {
  let q = query.is("deleted_at", null);
  if (filters.activeFilters.status.length > 0) {
    q = q.in("status", filters.activeFilters.status);
  }
  if (filters.activeFilters.kategorie.length > 0) {
    q = q.in("kundentyp", filters.activeFilters.kategorie);
  }
  if (filters.activeFilters.betriebstyp.length > 0) {
    q = q.in("firmentyp", filters.activeFilters.betriebstyp);
  }
  if (filters.activeFilters.land.length > 0) {
    q = q.in("land", filters.activeFilters.land);
  }
  if (filters.activeFilters.wassertyp.length > 0) {
    q = q.in("wassertyp", filters.activeFilters.wassertyp);
  }
  if (filters.waterFilter) {
    switch (filters.waterFilter) {
      case "at":
        q = q.eq("wasserdistanz", 0);
        break;
      case "le100":
        q = q.lte("wasserdistanz", 100);
        break;
      case "le500":
        q = q.lte("wasserdistanz", 500);
        break;
      case "le1km":
        q = q.lte("wasserdistanz", 1000);
        break;
      case "gt1km":
        q = q.gt("wasserdistanz", 1000);
        break;
    }
  }
  return q;
}

/**
 * Same `ilike` OR as the non-hybrid list path, but returns matching ids only.
 * Merged into hybrid results so rows missing from FTS/vector (e.g. just inserted,
 * embedding not stored yet, or `search_vector` not updated) still match firmenname.
 */
async function fetchLexicalCompanyIdsForMerge(
  supabase: SupabaseClient<Database>,
  filters: CompaniesListFilterSlice,
  trimmedGlobal: string,
): Promise<string[]> {
  if (trimmedGlobal.length === 0) {
    return [];
  }
  let q = supabase.from("companies").select("id");
  q = applyLexicalGlobalFilter(applyNonGlobalCompaniesFilters(q, filters), trimmedGlobal);
  const { data, error } = await q.limit(HYBRID_LEXICAL_MERGED_ID_CAP);
  if (error) {
    console.warn("[companies-list-supabase] Lexical merge query failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id);
}

/** Hybrid RRF order first, then lexical-only rows; capped for `.in()` size. */
function mergeHybridAndLexicalRankedIds(hybridRanked: string[], lexicalIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of hybridRanked) {
    if (out.length >= HYBRID_LEXICAL_MERGED_ID_CAP) {
      break;
    }
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of lexicalIds) {
    if (out.length >= HYBRID_LEXICAL_MERGED_ID_CAP) {
      break;
    }
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Applies list filters to a `companies` select query (same rules as the list page).
 *
 * Synchronous lexical path — preserved as-is for backward compatibility:
 * `globalFilter` uses `ilike` OR across firmenname/strasse/stadt. For semantic
 * hybrid search, callers should use {@link applyCompaniesListFiltersToCompaniesQueryWithHybrid}.
 */
export function applyCompaniesListFiltersToCompaniesQuery(
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
  query: any,
  filters: CompaniesListFilterSlice,
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
): any {
  const q = applyNonGlobalCompaniesFilters(query, filters);
  return applyLexicalGlobalFilter(q, filters.globalFilter);
}

// biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
export type CompaniesFilterApplier = (query: any) => any;

/**
 * Async factory that resolves the hybrid (semantic + FTS) filter *separately*
 * from the live Supabase query builder, then returns a synchronous applier
 * function that the caller uses on a freshly-built query.
 *
 * Why a factory (and not a direct builder)?
 *   supabase-js PostgREST builders are thenable. Returning one from an async
 *   function causes `await` to inadvertently execute the query (and resolve to
 *   `{ data, error, count }`, which has no `.order()`/`.range()`). Returning a
 *   non-thenable function sidesteps this entirely.
 *
 * Behaviour (unchanged semantics):
 *   1. Applies all non-global filters (status, kategorie, betriebstyp, land,
 *      wassertyp, waterFilter, deleted_at).
 *   2. For a non-empty `globalFilter`, generates an embedding and calls
 *      `hybrid_company_search`, then unions the same lexical `ilike` id set
 *      (so new imports still match firmenname before FTS/embedding catch up).
 *   3. Any failure (embedding API, RPC, network) silently falls back to the
 *      lexical `ilike` path.
 *
 * Note: requires the injected {@link SupabaseClient} used for the caller query
 * — never create a new browser client here.
 */
export type BuildCompaniesFilterApplierResult = {
  applyFilters: CompaniesFilterApplier;
  globalSearchStrategy: CompaniesGlobalSearchStrategy;
  /**
   * Company ids for the hybrid strategy: RRF order from `hybrid_company_search`,
   * then lexical-only matches (same fields as list `ilike` search). Only
   * populated for `"hybrid"` — use for relevance ordering on the list/detail nav.
   */
  rankedIds?: string[];
};

export async function buildCompaniesFilterApplier(
  supabase: SupabaseClient<Database>,
  filters: CompaniesListFilterSlice,
): Promise<BuildCompaniesFilterApplierResult> {
  const trimmed = filters.globalFilter.trim();
  if (trimmed.length === 0) {
    return {
      applyFilters: (query) => applyNonGlobalCompaniesFilters(query, filters),
      globalSearchStrategy: "none",
    };
  }

  const semanticSettings = await resolveSemanticSearchSettings(supabase);
  if (!semanticSettings.semanticSearchEnabled) {
    return {
      applyFilters: (query) =>
        applyLexicalGlobalFilter(applyNonGlobalCompaniesFilters(query, filters), trimmed),
      globalSearchStrategy: "keyword_semantic_disabled",
    };
  }

  try {
    const embedding = await createCompanySearchEmbedding(
      { text: trimmed, supabase },
      semanticSettings,
    );
    const ranked = await hybridCompanySearch(supabase, {
      query: trimmed,
      queryEmbedding: embedding,
      matchCount: HYBRID_MATCH_COUNT,
    });
    const hybridIds = ranked.map((row) => row.companyId);
    const lexicalIds = await fetchLexicalCompanyIdsForMerge(supabase, filters, trimmed);
    const rankedIds = mergeHybridAndLexicalRankedIds(hybridIds, lexicalIds);
    return {
      applyFilters: (query) => {
        const base = applyNonGlobalCompaniesFilters(query, filters);
        if (rankedIds.length === 0) {
          return base.eq("id", HYBRID_EMPTY_RESULT_SENTINEL);
        }
        return base.in("id", rankedIds);
      },
      globalSearchStrategy: "hybrid",
      rankedIds,
    };
  } catch (err) {
    console.warn("[companies-list-supabase] Semantic search failed, falling back to lexical search.", err);
    return {
      applyFilters: (query) =>
        applyLexicalGlobalFilter(applyNonGlobalCompaniesFilters(query, filters), trimmed),
      globalSearchStrategy: "keyword_fallback",
    };
  }
}

/**
 * Fetches all company ids matching list filters + sort order (ignores list pagination),
 * chunked to respect PostgREST row limits. Uses hybrid semantic search when a global filter
 * is present (with silent lexical fallback on failure).
 */
export async function fetchAllCompanyIdsForListNavigation(
  supabase: SupabaseClient<Database>,
  listState: CompaniesListUrlState,
): Promise<string[]> {
  const filterSlice: CompaniesListFilterSlice = {
    globalFilter: listState.globalFilter,
    activeFilters: listState.activeFilters,
    waterFilter: listState.waterFilter,
  };
  const { applyFilters, rankedIds } = await buildCompaniesFilterApplier(supabase, filterSlice);
  const sort = listState.sorting[0];

  // Hybrid path: matching ids are `rankedIds` intersected with non-global
  // filters. Keep them in RRF order so prev/next on the detail page follows
  // the same semantic ranking the list visibly uses.
  if (rankedIds !== undefined) {
    if (rankedIds.length === 0) {
      return [];
    }
    const survivingIds = new Set<string>();
    let offset = 0;
    for (;;) {
      const baseQuery = supabase.from("companies").select("id");
      const { data, error } = await applyFilters(baseQuery).range(offset, offset + CHUNK - 1);
      if (error) {
        throw error;
      }
      const rows = data ?? [];
      for (const row of rows) {
        survivingIds.add(row.id);
      }
      if (rows.length < CHUNK) {
        break;
      }
      offset += CHUNK;
    }
    return rankedIds.filter((id) => survivingIds.has(id));
  }

  const ids: string[] = [];
  let offset = 0;
  for (;;) {
    const baseQuery = supabase.from("companies").select("id");
    let q = applyFilters(baseQuery);
    if (sort) {
      q = q.order(companiesSortIdForQuery(sort.id), { ascending: !sort.desc });
    }
    const { data, error } = await q.range(offset, offset + CHUNK - 1);
    if (error) {
      throw error;
    }
    const rows = data ?? [];
    for (const row of rows) {
      ids.push(row.id);
    }
    if (rows.length < CHUNK) {
      break;
    }
    offset += CHUNK;
  }
  return ids;
}
