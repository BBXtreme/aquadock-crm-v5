/**
 * Shared Supabase query filters for the /companies list (same logic as `ClientCompaniesPage`).
 * Used for company-detail prev/next navigation over the filtered + sorted set.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompaniesListUrlState } from "@/lib/utils/company-filters-url-state";
import { companiesSortIdForQuery } from "@/lib/utils/company-filters-url-state";
import type { Database } from "@/types/database.types";

export type CompaniesListFilterSlice = Pick<CompaniesListUrlState, "globalFilter" | "activeFilters" | "waterFilter">;

const CHUNK = 1000;

/** Applies list filters to a `companies` select query (same rules as the list page). */
export function applyCompaniesListFiltersToCompaniesQuery(
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
  query: any,
  filters: CompaniesListFilterSlice,
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST filter builder from supabase-js is not exported as a stable public type
): any {
  let q = query.is("deleted_at", null);
  const g = filters.globalFilter.trim();
  if (g.length > 0) {
    q = q.or(`firmenname.ilike.%${g}%,strasse.ilike.%${g}%,stadt.ilike.%${g}%`);
  }
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
 * Fetches all company ids matching list filters + sort order (ignores list pagination),
 * chunked to respect PostgREST row limits.
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
  const sort = listState.sorting[0];
  const ids: string[] = [];
  let offset = 0;
  for (;;) {
    let q = supabase.from("companies").select("id");
    q = applyCompaniesListFiltersToCompaniesQuery(q, filterSlice);
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
