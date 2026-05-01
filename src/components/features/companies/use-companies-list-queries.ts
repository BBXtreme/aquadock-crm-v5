"use client";

import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { WaterPreset } from "@/components/features/companies/client-companies-constants";
import { companiesFilterBucketsFromRpcData } from "@/lib/companies/companies-filter-buckets";
import type { SearchCompaniesListResult } from "@/lib/server/companies-search";
import { createClient } from "@/lib/supabase/browser";
import type { CompaniesFilterGroup } from "@/lib/utils/company-filters-url-state";

export const COMPANIES_FILTER_OPTIONS_QUERY_KEY = ["companies-filter-options"] as const;

async function fetchCompaniesFilterOptions() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("companies_filter_buckets");
  if (error) throw error;
  return companiesFilterBucketsFromRpcData(data);
}

/** Distinct ISO `companies.land` codes from active rows (sorted). Shares cache with list filter chips. */
export function useDistinctCompanyLandCodes(): readonly string[] {
  const { data } = useQuery({
    queryKey: COMPANIES_FILTER_OPTIONS_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: fetchCompaniesFilterOptions,
  });
  return data ? [...data.land].sort((a, b) => a.localeCompare(b)) : [];
}

type ListPagination = { pageIndex: number; pageSize: number };

type ListSorting = { id: string; desc: boolean }[];

type ActiveFilters = Record<CompaniesFilterGroup, string[]>;

export function useCompaniesListQueries(options: {
  pagination: ListPagination;
  activeFilters: ActiveFilters;
  waterFilter: WaterPreset | null;
  sorting: ListSorting;
  sortExplicit: boolean;
  debouncedGlobalFilter: string;
}) {
  const { pagination, activeFilters, waterFilter, sorting, sortExplicit, debouncedGlobalFilter } = options;

  const { data: distinctFilterValues } = useQuery({
    queryKey: COMPANIES_FILTER_OPTIONS_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: fetchCompaniesFilterOptions,
  });

  const distinctLands = distinctFilterValues ? Array.from(distinctFilterValues.land).sort() : [];

  const companiesData = useQuery({
    queryKey: [
      "companies",
      pagination.pageIndex,
      pagination.pageSize,
      activeFilters,
      waterFilter,
      sorting,
      sortExplicit,
      debouncedGlobalFilter,
    ],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/companies/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          globalFilter: debouncedGlobalFilter,
          activeFilters,
          waterFilter,
          sorting,
          sortExplicit,
          pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize },
        }),
        signal,
      });
      if (!res.ok) {
        throw new Error(`Companies search failed (${res.status})`);
      }
      return (await res.json()) as SearchCompaniesListResult;
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    gcTime: 5 * 60 * 1000,
  });

  const companies = companiesData.data?.companies ?? [];
  const total = companiesData.data?.totalCount ?? 0;
  const globalSearchStrategyFromApi = companiesData.data?.globalSearchStrategy ?? "none";
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
  const companiesInitialLoading = companiesData.isPending && companiesData.data === undefined;
  const companiesIsFetching = companiesData.isFetching;

  const semanticBadgeData = useQuery({
    queryKey: ["companies-semantic-badge-setting"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { semanticSearchEnabled: true, showSemanticBadge: true };
      }
      const { data: rows, error } = await supabase
        .from("user_settings")
        .select("key, value")
        .eq("user_id", user.id)
        .in("key", ["semantic_search_enabled", "show_semantic_badge"]);
      if (error || !rows?.length) {
        return { semanticSearchEnabled: true, showSemanticBadge: true };
      }
      const parseBool = (key: string, fallback: boolean): boolean => {
        const row = rows.find((r) => r.key === key);
        if (!row) return fallback;
        const raw = row.value;
        if (typeof raw === "boolean") return raw;
        if (raw === "true" || raw === "1" || raw === 1) return true;
        if (raw === "false" || raw === "0" || raw === 0) return false;
        return fallback;
      };
      return {
        semanticSearchEnabled: parseBool("semantic_search_enabled", true),
        showSemanticBadge: parseBool("show_semantic_badge", true),
      };
    },
  });

  const showSemanticBadge =
    (semanticBadgeData.data?.semanticSearchEnabled ?? true) && (semanticBadgeData.data?.showSemanticBadge ?? true);

  const statsData = useSuspenseQuery({
    queryKey: ["companies-stats"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("companies").select("status, value").is("deleted_at", null);
      const rowCount = data?.length || 0;
      const leads = data?.filter((c) => c.status === "lead").length || 0;
      const won = data?.filter((c) => c.status === "gewonnen").length || 0;
      const value = data?.reduce((sum, c) => sum + (c.value ?? 0), 0) || 0;
      return { total: rowCount, leads, won, value };
    },
  });

  return {
    distinctFilterValues,
    distinctLands,
    companies,
    total,
    globalSearchStrategyFromApi,
    pageCount,
    companiesInitialLoading,
    companiesIsFetching,
    showSemanticBadge,
    stats: statsData.data,
  };
}
