// src/lib/server/companies-search.ts
// Server-only query helper for the /companies list search + pagination.
// Not a Server Action (no mutations) — exposed via the /api/companies/search
// Route Handler so it can be safely called from `useSuspenseQuery` during
// SSR/hydration without tripping Next.js 16's "Server Functions cannot be
// called during initial render" guard.

import "server-only";

import { z } from "zod";
import {
  buildCompaniesFilterApplier,
  type CompaniesGlobalSearchStrategy,
} from "@/lib/companies/companies-list-supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type CompaniesFilterGroup,
  companiesSortIdForQuery,
} from "@/lib/utils/company-filters-url-state";
import type { Company, Contact } from "@/types/database.types";

export type CompaniesListWaterPreset = "at" | "le100" | "le500" | "le1km" | "gt1km";

export type SearchCompaniesListInput = {
  globalFilter: string;
  activeFilters: Record<CompaniesFilterGroup, string[]>;
  waterFilter: CompaniesListWaterPreset | null;
  sorting: { id: string; desc: boolean }[];
  pagination: { pageIndex: number; pageSize: number };
  /**
   * True when the user explicitly clicked a column header; false when the
   * sort is the app default. Only matters in the hybrid search path — if
   * false and hybrid is active, the server sorts by RRF relevance instead
   * of `sorting`, so the most semantically relevant row stays at the top.
   * If true, the user's column sort wins over RRF.
   */
  sortExplicit?: boolean;
};

export type CompanyWithContacts = Company & { contacts?: Contact[] };

export type SearchCompaniesListResult = {
  companies: CompanyWithContacts[];
  totalCount: number;
  /** How `globalFilter` was applied on the server (hybrid vs keyword paths). */
  globalSearchStrategy: CompaniesGlobalSearchStrategy;
};

const filterGroupSchema = z.object({
  status: z.array(z.string()),
  kategorie: z.array(z.string()),
  betriebstyp: z.array(z.string()),
  land: z.array(z.string()),
  wassertyp: z.array(z.string()),
});

export const searchCompaniesListInputSchema = z.object({
  globalFilter: z.string(),
  activeFilters: filterGroupSchema,
  waterFilter: z.enum(["at", "le100", "le500", "le1km", "gt1km"]).nullable(),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })),
  pagination: z.object({
    pageIndex: z.number().int().min(0),
    pageSize: z.number().int().min(1).max(500),
  }),
  sortExplicit: z.boolean().optional(),
});

const COMPANIES_SELECT = `
      *,
      contacts (
        id,
        vorname,
        nachname,
        position,
        is_primary,
        deleted_at
      )
    `;

function stripDeletedContacts(rows: CompanyWithContacts[]): CompanyWithContacts[] {
  return rows.map((row) => ({
    ...row,
    contacts: (row.contacts ?? []).filter(
      (ct: { deleted_at?: string | null }) => ct.deleted_at == null,
    ),
  }));
}

export async function searchCompaniesList(
  input: SearchCompaniesListInput,
): Promise<SearchCompaniesListResult> {
  const supabase = await createServerSupabaseClient();

  const { applyFilters, globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
    supabase,
    {
      globalFilter: input.globalFilter,
      activeFilters: input.activeFilters,
      waterFilter: input.waterFilter,
    },
  );

  // Hybrid path: matching rows = `rankedIds` ∩ non-global filters.
  //
  // Ordering rules:
  //  - Default (user hasn't clicked a column header while searching):
  //    rows are returned in RRF-relevance order so the best semantic match
  //    is always at the top.
  //  - When the user explicitly clicks a column header (`sortExplicit` is
  //    true), that sort wins — the hybrid-matched rows are re-sorted by
  //    the chosen column. Relevance is only the *default* within the
  //    hybrid-filtered set, not a lock.
  if (rankedIds !== undefined) {
    if (rankedIds.length === 0) {
      return { companies: [], totalCount: 0, globalSearchStrategy };
    }

    const filteredQuery = applyFilters(supabase.from("companies").select(COMPANIES_SELECT));
    const { data, error } = await filteredQuery.limit(rankedIds.length);
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as CompanyWithContacts[];

    const explicitSort = input.sortExplicit === true ? input.sorting[0] : undefined;
    let orderedRows: CompanyWithContacts[];
    if (explicitSort) {
      const sortKey = companiesSortIdForQuery(explicitSort.id) as keyof CompanyWithContacts;
      const direction = explicitSort.desc ? -1 : 1;
      orderedRows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * direction;
        }
        return String(av).localeCompare(String(bv), "de", { sensitivity: "base" }) * direction;
      });
    } else {
      const byId = new Map(rows.map((row) => [row.id, row]));
      orderedRows = [];
      for (const id of rankedIds) {
        const row = byId.get(id);
        if (row) {
          orderedRows.push(row);
        }
      }
    }

    const from = input.pagination.pageIndex * input.pagination.pageSize;
    const to = from + input.pagination.pageSize;
    const pageRows = orderedRows.slice(from, to);
    return {
      companies: stripDeletedContacts(pageRows),
      totalCount: orderedRows.length,
      globalSearchStrategy,
    };
  }

  const baseQuery = supabase
    .from("companies")
    .select(COMPANIES_SELECT, { count: "exact" });

  let query = applyFilters(baseQuery);

  if (input.sorting.length > 0) {
    const sort = input.sorting[0];
    if (sort) {
      query = query.order(companiesSortIdForQuery(sort.id), { ascending: !sort.desc });
    }
  }

  const from = input.pagination.pageIndex * input.pagination.pageSize;
  const to = from + input.pagination.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as CompanyWithContacts[];
  return {
    companies: stripDeletedContacts(rows),
    totalCount: count ?? 0,
    globalSearchStrategy,
  };
}

export type { CompaniesGlobalSearchStrategy } from "@/lib/companies/companies-list-supabase";
