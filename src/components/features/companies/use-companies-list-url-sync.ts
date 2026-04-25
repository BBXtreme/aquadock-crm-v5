"use client";

import type { VisibilityState } from "@tanstack/react-table";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";
import type { WaterPreset } from "@/components/features/companies/client-companies-constants";
import {
  type CompaniesFilterGroup,
  companiesListStatesEqual,
  hasAnyCompaniesListParamKey,
  mergeCompaniesListIntoPath,
  mergeSessionCompaniesListQuery,
  parseCompaniesListState,
  readCompaniesListQueryFromSession,
  serializeCompaniesListToSearchParamsString,
  shouldDeferEmptySessionWriteWhileRestoring,
  writeCompaniesListQueryToSession,
} from "@/lib/utils/company-filters-url-state";

type ListPagination = { pageIndex: number; pageSize: number };

type ListSorting = { id: string; desc: boolean }[];

type ActiveFilters = Record<CompaniesFilterGroup, string[]>;

export type CompaniesListRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export function useCompaniesListUrlSync(options: {
  pathname: string;
  router: CompaniesListRouter;
  searchParams: ReadonlyURLSearchParams;
  urlDebouncedGlobalFilter: string;
  pagination: ListPagination;
  sorting: ListSorting;
  activeFilters: ActiveFilters;
  columnVisibility: VisibilityState;
  waterFilter: WaterPreset | null;
  setPagination: Dispatch<SetStateAction<ListPagination>>;
  setSorting: Dispatch<SetStateAction<ListSorting>>;
  setActiveFilters: Dispatch<SetStateAction<ActiveFilters>>;
  setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
  setWaterFilter: Dispatch<SetStateAction<WaterPreset | null>>;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
}): void {
  const {
    pathname,
    router,
    searchParams,
    urlDebouncedGlobalFilter,
    pagination,
    sorting,
    activeFilters,
    columnVisibility,
    waterFilter,
    setPagination,
    setSorting,
    setActiveFilters,
    setColumnVisibility,
    setWaterFilter,
    setGlobalFilter,
  } = options;

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsString);
    if (hasAnyCompaniesListParamKey(sp)) {
      return;
    }
    const sq = readCompaniesListQueryFromSession();
    if (sq === null || sq.length === 0) {
      return;
    }
    const href = mergeSessionCompaniesListQuery(pathname, sp, sq);
    const currentHref = `${pathname}${searchParamsString.length > 0 ? `?${searchParamsString}` : ""}`;
    if (href === currentHref) {
      return;
    }
    router.replace(href, { scroll: false });
  }, [pathname, router, searchParamsString]);

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsString);
    const fromUrl = parseCompaniesListState(sp);
    setPagination(fromUrl.pagination);
    setSorting(fromUrl.sorting);
    setActiveFilters(fromUrl.activeFilters);
    setColumnVisibility(fromUrl.columnVisibility);
    setWaterFilter(fromUrl.waterFilter);
    setGlobalFilter(fromUrl.globalFilter);
  }, [searchParamsString, setActiveFilters, setColumnVisibility, setGlobalFilter, setPagination, setSorting, setWaterFilter]);

  useEffect(() => {
    const sp = searchParamsRef.current;
    const reactState = {
      pagination,
      sorting,
      activeFilters,
      columnVisibility,
      waterFilter,
      globalFilter: urlDebouncedGlobalFilter,
    };
    const urlState = parseCompaniesListState(sp);
    const persistSession = () => {
      const serialized = serializeCompaniesListToSearchParamsString(reactState);
      if (!shouldDeferEmptySessionWriteWhileRestoring(serialized, sp)) {
        writeCompaniesListQueryToSession(serialized);
      }
    };
    if (companiesListStatesEqual(reactState, urlState)) {
      persistSession();
      return;
    }
    const href = mergeCompaniesListIntoPath(pathname, sp, reactState);
    const currentHref = `${pathname}${sp.toString().length > 0 ? `?${sp.toString()}` : ""}`;
    if (href === currentHref) {
      persistSession();
      return;
    }
    persistSession();
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", href);
    }
  }, [pagination, sorting, activeFilters, columnVisibility, waterFilter, urlDebouncedGlobalFilter, pathname]);
}
