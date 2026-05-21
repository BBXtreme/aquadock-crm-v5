// src/lib/server/companies-search.ts
// Server-only query helper for the /companies list search + pagination.
// Not a Server Action (no mutations) — exposed via the /api/companies/search
// Route Handler so it can be safely called from `useSuspenseQuery` during
// SSR/hydration without tripping Next.js 16's "Server Functions cannot be
// called during initial render" guard.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logPhase1Perf } from "@/lib/companies/companies-hot-path";
import {
  buildCompaniesFilterApplier,
  type CompaniesGlobalSearchStrategy,
} from "@/lib/companies/companies-list-supabase";
import type { ServerTiming } from "@/lib/server/server-timing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type CompaniesFilterGroup,
  companiesSortIdForQuery,
} from "@/lib/utils/company-filters-url-state";
import type { Company, Contact, Database, Profile } from "@/types/database.types";

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

export type CompanyWithContacts = Company & {
  contacts?: Contact[];
  owner_profile?: Pick<Profile, "display_name"> | null;
};

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

async function attachOwnerProfiles(
  supabase: SupabaseClient<Database>,
  rows: CompanyWithContacts[],
): Promise<CompanyWithContacts[]> {
  const ids = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => id !== null && id !== undefined && id.length > 0),
    ),
  ];
  if (ids.length === 0) {
    return rows.map((row) => ({ ...row, owner_profile: null }));
  }
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  if (error) {
    throw error;
  }
  const map = new Map((data ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    owner_profile: row.user_id ? (map.get(row.user_id) ?? null) : null,
  }));
}

export async function searchCompaniesList(
  input: SearchCompaniesListInput,
  timing?: ServerTiming,
): Promise<SearchCompaniesListResult> {
  const supabase = await createServerSupabaseClient();

  const startedAt = Date.now();
  const { applyFilters, globalSearchStrategy, rankedIds } = await buildCompaniesFilterApplier(
    supabase,
    {
      globalFilter: input.globalFilter,
      activeFilters: input.activeFilters,
      waterFilter: input.waterFilter,
    },
    timing,
  );

  // Hybrid path: matching rows = `rankedIds` ∩ non-global filters.
  //
  // Ordering rules:
  //  - Default (user hasn't clicked a column header while searching):
  //    two-phase fetch — phase A ids only, phase B page rows with contacts.
  //  - Explicit column sort: fetch full survivor set, sort in memory, paginate.
  if (rankedIds !== undefined) {
    if (rankedIds.length === 0) {
      return { companies: [], totalCount: 0, globalSearchStrategy };
    }

    const explicitSort = input.sortExplicit === true ? input.sorting[0] : undefined;

    if (!explicitSort) {
      const phaseAStarted = Date.now();
      const stopPhaseA = timing?.start("phase_a");
      const survivorIdsQuery = applyFilters(supabase.from("companies").select("id"));
      const { data: survivorRows, error: survivorError } = await survivorIdsQuery.limit(
        rankedIds.length,
      );
      stopPhaseA?.();
      if (survivorError) {
        throw survivorError;
      }
      const survivors = new Set(
        (survivorRows ?? []).map((row: { id: string }) => row.id),
      );
      const orderedIds: string[] = [];
      for (const id of rankedIds) {
        if (survivors.has(id)) {
          orderedIds.push(id);
        }
      }
      const totalCount = orderedIds.length;
      const from = input.pagination.pageIndex * input.pagination.pageSize;
      const to = from + input.pagination.pageSize;
      const pageIds = orderedIds.slice(from, to);
      logPhase1Perf("hybrid.twoPhase.phaseA", {
        rankedIdsCount: rankedIds.length,
        survivorCount: survivors.size,
        totalCount,
        pageIdsCount: pageIds.length,
        durationMs: Date.now() - phaseAStarted,
      });
      if (pageIds.length === 0) {
        return { companies: [], totalCount, globalSearchStrategy };
      }
      const phaseBStarted = Date.now();
      const stopPhaseB = timing?.start("phase_b");
      const { data: pageData, error: pageError } = await supabase
        .from("companies")
        .select(COMPANIES_SELECT)
        .in("id", pageIds);
      stopPhaseB?.();
      if (pageError) {
        throw pageError;
      }
      const pageRowsRaw = (pageData ?? []) as CompanyWithContacts[];
      const byId = new Map(pageRowsRaw.map((row) => [row.id, row]));
      const orderedRows: CompanyWithContacts[] = [];
      for (const id of pageIds) {
        const row = byId.get(id);
        if (row) {
          orderedRows.push(row);
        }
      }
      const stripped = stripDeletedContacts(orderedRows);
      const companies = await attachOwnerProfiles(supabase, stripped);
      logPhase1Perf("hybrid.twoPhase.phaseB", {
        pageRows: companies.length,
        durationMs: Date.now() - phaseBStarted,
        totalDurationMs: Date.now() - startedAt,
        strategy: globalSearchStrategy,
      });
      return {
        companies,
        totalCount,
        globalSearchStrategy,
      };
    }

    const stopExplicitSort = timing?.start("explicit_sort");
    const filteredQuery = applyFilters(supabase.from("companies").select(COMPANIES_SELECT));
    const { data, error } = await filteredQuery.limit(rankedIds.length);
    stopExplicitSort?.();
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as CompanyWithContacts[];
    const sortKey = companiesSortIdForQuery(explicitSort.id) as keyof CompanyWithContacts;
    const direction = explicitSort.desc ? -1 : 1;
    const orderedRows = [...rows].sort((a, b) => {
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

    const from = input.pagination.pageIndex * input.pagination.pageSize;
    const to = from + input.pagination.pageSize;
    const pageRows = orderedRows.slice(from, to);
    const stripped = stripDeletedContacts(pageRows);
    logPhase1Perf("hybrid.explicitSort.done", {
      fetchedRows: rows.length,
      pageRows: pageRows.length,
      totalCount: orderedRows.length,
      durationMs: Date.now() - startedAt,
      strategy: globalSearchStrategy,
    });
    return {
      companies: await attachOwnerProfiles(supabase, stripped),
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

  const stopNonHybrid = timing?.start("non_hybrid");
  const { data, error, count } = await query;
  stopNonHybrid?.();
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as CompanyWithContacts[];
  const stripped = stripDeletedContacts(rows);
  const companies = await attachOwnerProfiles(supabase, stripped);
  logPhase1Perf("nonHybrid.done", {
    rows: rows.length,
    totalCount: count ?? 0,
    durationMs: Date.now() - startedAt,
    strategy: globalSearchStrategy,
  });
  return {
    companies,
    totalCount: count ?? 0,
    globalSearchStrategy,
  };
}

export type { CompaniesGlobalSearchStrategy } from "@/lib/companies/companies-list-supabase";
