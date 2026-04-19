// src/lib/server/companies-search.ts
// Server-only query helper for the /companies list search + pagination.
// Not a Server Action (no mutations) — exposed via the /api/companies/search
// Route Handler so it can be safely called from `useSuspenseQuery` during
// SSR/hydration without tripping Next.js 16's "Server Functions cannot be
// called during initial render" guard.

import "server-only";

import { z } from "zod";
import { buildCompaniesFilterApplier } from "@/lib/companies/companies-list-supabase";
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
};

export type CompanyWithContacts = Company & { contacts?: Contact[] };

export type SearchCompaniesListResult = {
  companies: CompanyWithContacts[];
  totalCount: number;
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
});

export async function searchCompaniesList(
  input: SearchCompaniesListInput,
): Promise<SearchCompaniesListResult> {
  const supabase = await createServerSupabaseClient();

  const applyFilters = await buildCompaniesFilterApplier(supabase, {
    globalFilter: input.globalFilter,
    activeFilters: input.activeFilters,
    waterFilter: input.waterFilter,
  });

  const baseQuery = supabase.from("companies").select(
    `
      *,
      contacts (
        id,
        vorname,
        nachname,
        position,
        is_primary,
        deleted_at
      )
    `,
    { count: "exact" },
  );

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
  const companies = rows.map((row) => ({
    ...row,
    contacts: (row.contacts ?? []).filter(
      (ct: { deleted_at?: string | null }) => ct.deleted_at == null,
    ),
  }));
  return { companies, totalCount: count ?? 0 };
}
