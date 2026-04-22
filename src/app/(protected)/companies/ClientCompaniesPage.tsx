"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { VisibilityState } from "@tanstack/react-table";
import { Building, DollarSign, Loader2, Locate, Plus, Trash, Trophy, Users, Waves, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CompanyCreateForm from "@/components/features/companies/CompanyCreateForm";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import { CSVImportDialog } from "@/components/features/companies/CSVImportDialog";
import { GeocodeReviewModal } from "@/components/features/companies/GeocodeReviewModal";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import {
  applyApprovedGeocodes,
  deleteCompany,
  type GeocodeBatchPreviewRow,
  geocodeCompanyBatch,
  updateCompany,
} from "@/lib/actions/companies";
import { bulkResearchCompanyEnrichment } from "@/lib/actions/company-enrichment";
import { bulkDeleteCompaniesWithTrash, restoreCompanyWithTrash } from "@/lib/actions/crm-trash";
import { kategorieIcons, statusIcons } from "@/lib/constants/company-icons";
import { firmentypOptions, kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { wassertypOptions } from "@/lib/constants/wassertyp";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { SearchCompaniesListResult } from "@/lib/server/companies-search";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
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
import type { Company } from "@/types/database.types";

type WaterPreset = "at" | "le100" | "le500" | "le1km" | "gt1km";

const GEOCODE_BATCH_MAX = 50;

const WATER_PRESETS = [
  { value: "at", labelKey: "waterAtWater" },
  { value: "le100", labelKey: "waterLe100" },
  { value: "le500", labelKey: "waterLe500" },
  { value: "le1km", labelKey: "waterLe1km" },
  { value: "gt1km", labelKey: "waterGt1km" },
] as const;

function companyNeedsGeocode(company: Company): boolean {
  const hasLat = typeof company.lat === "number" && Number.isFinite(company.lat);
  const hasLon = typeof company.lon === "number" && Number.isFinite(company.lon);
  const lat = company.lat;
  const lon = company.lon;
  const coordsOk =
    hasLat &&
    hasLon &&
    typeof lat === "number" &&
    typeof lon === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;
  if (coordsOk) {
    return false;
  }
  const stadt = (company.stadt ?? "").trim();
  const strasse = (company.strasse ?? "").trim();
  const plz = (company.plz ?? "").trim();
  return stadt.length > 0 && (strasse.length > 0 || plz.length > 0);
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function ClientCompaniesPage() {
  const t = useT("companies");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "firmenname", desc: false }]);
  // Tracks whether the current `sorting` was set by a user column-header click
  // (true) or is the app default / restored from URL (false). The server uses
  // it to pick between RRF relevance ordering (default) and the user's sort
  // in the hybrid-search path. Reset when the search box is cleared so
  // relevance ordering becomes the default again on the next search.
  const [sortExplicit, setSortExplicit] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Record<CompaniesFilterGroup, string[]>>({
    status: [],
    kategorie: [],
    betriebstyp: [],
    land: [],
    wassertyp: [],
  });
  const [waterFilter, setWaterFilter] = useState<WaterPreset | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ verantwortlich: false });
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [_bulkAiEnrichPending, setBulkAiEnrichPending] = useState(false);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);

  // Fast debounce drives the actual query (semantic/hybrid search + TanStack Query key).
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);
  // Slower debounce drives URL + session persistence so typing never feels janky
  // (router.replace on every keystroke is expensive in Next.js App Router).
  const urlDebouncedGlobalFilter = useDebounce(globalFilter, 800);

  const openCreateFromQuery = searchParams.get("create") === "true";
  const trashedCompanyRedirect = searchParams.get("trashedCompany") === "1";

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
  }, [searchParamsString]);

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
    // Use history.replaceState (not router.replace) so the URL bar updates
    // without triggering a Next.js router state change. This prevents every
    // debounced keystroke from re-rendering the whole page tree via
    // useSearchParams subscribers; only the components reading our local
    // React state re-render, which is what we want.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", href);
    }
  }, [pagination, sorting, activeFilters, columnVisibility, waterFilter, urlDebouncedGlobalFilter, pathname]);

  const { data: distinctFilterValues } = useQuery({
    queryKey: ["companies-filter-options"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("status, kundentyp, firmentyp, land, wassertyp")
        .is("deleted_at", null);
      if (error) throw error;
      const rows = data ?? [];
      const pick = (key: "status" | "kundentyp" | "firmentyp" | "land" | "wassertyp") =>
        new Set(rows.map((r) => r[key]).filter((v): v is string => !!v));
      return {
        status: pick("status"),
        kundentyp: pick("kundentyp"),
        firmentyp: pick("firmentyp"),
        land: pick("land"),
        wassertyp: pick("wassertyp"),
      };
    },
  });

  const distinctLands = distinctFilterValues
    ? Array.from(distinctFilterValues.land).sort()
    : [];

  const handleGlobalFilterChange = (next: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setGlobalFilter(next);
    if (next.trim().length === 0) {
      setSortExplicit(false);
    }
  };

  const toggleFilter = (group: CompaniesFilterGroup, value: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(value) ? prev[group].filter((v) => v !== value) : [...prev[group], value],
    }));
  };

  const removeFilter = (group: CompaniesFilterGroup, value: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].filter((v) => v !== value),
    }));
  };

  const handleSortingChange = (next: { id: string; desc: boolean }[]) => {
    setSorting(next);
    setSortExplicit(true);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  // Non-suspense query so typing into the search box refreshes ONLY the table,
  // keeping previous rows visible while the new result is in flight — the page
  // no longer falls back to the outer <CompaniesPageSkeleton> on every keystroke.
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
  /** Sparkles only when semantic search is on AND the user keeps “show badge” enabled in Settings. */
  const showSemanticBadge =
    (semanticBadgeData.data?.semanticSearchEnabled ?? true) &&
    (semanticBadgeData.data?.showSemanticBadge ?? true);

  const statsData = useSuspenseQuery({
    queryKey: ["companies-stats"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("companies").select("status, value").is("deleted_at", null);
      const total = data?.length || 0;
      const leads = data?.filter((c) => c.status === "lead").length || 0;
      const won = data?.filter((c) => c.status === "gewonnen").length || 0;
      const value = data?.reduce((sum, c) => sum + (c.value ?? 0), 0) || 0;
      return { total, leads, won, value };
    },
  });

  const stats = statsData.data;

  const _updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) =>
      updateCompany(id, updates),
    onMutate: async ({ id, updates }) => {
      const queryKey = [
        "companies",
        pagination.pageIndex,
        pagination.pageSize,
        activeFilters,
        waterFilter,
        sorting,
        sortExplicit,
        debouncedGlobalFilter,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<SearchCompaniesListResult>(queryKey);
      if (previousCompanies) {
        queryClient.setQueryData(queryKey, {
          ...previousCompanies,
          companies: previousCompanies.companies.map((company) =>
            company.id === id ? { ...company, ...updates } : company,
          ),
        });
      }
      return { previousCompanies, queryKey };
    },
    onError: (err, _variables, context) => {
      const ctx = context as {
        previousCompanies?: SearchCompaniesListResult;
        queryKey?: string[];
      };
      if (ctx?.previousCompanies && ctx.queryKey) {
        queryClient.setQueryData(ctx.queryKey, ctx.previousCompanies);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastUpdateFailed"), { description: message });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["companies"] });
      toast.success(t("toastUpdated"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onMutate: async (id) => {
      const queryKey = [
        "companies",
        pagination.pageIndex,
        pagination.pageSize,
        activeFilters,
        waterFilter,
        sorting,
        sortExplicit,
        debouncedGlobalFilter,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<SearchCompaniesListResult>(queryKey);
      if (previousCompanies) {
        queryClient.setQueryData(queryKey, {
          ...previousCompanies,
          companies: previousCompanies.companies.filter((company) => company.id !== id),
          totalCount: Math.max(0, previousCompanies.totalCount - 1),
        });
      }
      return { previousCompanies, queryKey };
    },
    onError: (err, _id, context) => {
      const ctx = context as {
        previousCompanies?: SearchCompaniesListResult;
        queryKey?: string[];
      };
      if (ctx?.previousCompanies && ctx.queryKey) {
        queryClient.setQueryData(ctx.queryKey, ctx.previousCompanies);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
    },
    onSuccess: (mode, id) => {
      queryClient.refetchQueries({ queryKey: ["companies"] });
      queryClient.refetchQueries({ queryKey: ["companies-stats"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreCompanyWithTrash(id).then(() => {
                queryClient.refetchQueries({ queryKey: ["companies"] });
                queryClient.refetchQueries({ queryKey: ["companies-stats"] });
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
    },
  });

  const _handleBulkAiEnrich = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) {
      return;
    }

    setBulkAiEnrichPending(true);
    const loadingId = toast.loading(t("aiEnrich.bulkProgressList", { total: selectedIds.length }));
    try {
      const res = await bulkResearchCompanyEnrichment({
        companyIds: selectedIds,
      });
      toast.dismiss(loadingId);
      if (!res.ok) {
        if (res.error === "NOT_AUTHENTICATED") {
          toast.error(t("aiEnrich.errorNotAuthenticated"));
        } else if (res.error === "AI_ENRICHMENT_DISABLED") {
          toast.error(t("aiEnrich.errorDisabled"));
        } else if (res.error === "AI_ENRICHMENT_RATE_LIMIT") {
          toast.error(t("aiEnrich.errorRateLimit"));
        } else if (res.error === "AI_GATEWAY_MISSING") {
          toast.error(t("aiEnrich.errorNoGateway"));
        } else {
          toast.error(t("aiEnrich.errorGeneric"));
        }
        return;
      }
      const ok = res.results.filter((r) => r.ok).length;
      const fail = res.results.length - ok;
      toast.success(t("aiEnrich.bulkDoneList", { ok, total: res.results.length, fail }));
    } catch {
      toast.dismiss(loadingId);
      toast.error(t("aiEnrich.errorGeneric"));
    } finally {
      setBulkAiEnrichPending(false);
    }
  };

  const handleBulkGeocodePreview = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) {
      return;
    }

    const items: {
      rowId: string;
      companyId: string;
      firmenname: string;
      strasse: string | null;
      plz: string | null;
      stadt: string | null;
      land: string | null;
      currentLat: number | null;
      currentLon: number | null;
    }[] = [];

    for (const id of selectedIds) {
      const company = companies.find((c) => c.id === id);
      if (company === undefined || !companyNeedsGeocode(company)) {
        continue;
      }
      items.push({
        rowId: `company-geocode-${company.id}`,
        companyId: company.id,
        firmenname: company.firmenname,
        strasse: company.strasse ?? null,
        plz: company.plz ?? null,
        stadt: company.stadt ?? null,
        land: company.land ?? null,
        currentLat: typeof company.lat === "number" ? company.lat : null,
        currentLon: typeof company.lon === "number" ? company.lon : null,
      });
    }

    if (items.length === 0) {
      toast.message("Keine ausgewählten Einträge für Geocoding.", {
        description: "Es fehlen gültige Adressdaten oder die Koordinaten sind bereits vollständig.",
      });
      return;
    }

    const trimmed = items.slice(0, GEOCODE_BATCH_MAX);
    if (items.length > GEOCODE_BATCH_MAX) {
      toast.message(`Es werden nur die ersten ${String(GEOCODE_BATCH_MAX)} Einträge geocodiert.`);
    }

    setGeocodeLoading(true);
    try {
      const res = await geocodeCompanyBatch({ items: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setGeocodePreviewRows(res.results);
      setGeocodeModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Geocoding fehlgeschlagen.";
      toast.error(message);
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleApplyCompanyGeocodes = async (rowIds: string[]) => {
    const previewById = new Map<string, GeocodeBatchPreviewRow>();
    for (const row of geocodePreviewRows) {
      previewById.set(row.rowId, row);
    }

    const applyItems = rowIds
      .map((rowId) => previewById.get(rowId))
      .filter(
        (preview): preview is GeocodeBatchPreviewRow =>
          preview !== undefined &&
          preview.companyId !== null &&
          preview.suggestedLat !== null &&
          preview.suggestedLon !== null,
      )
      .map((preview) => ({
        companyId: preview.companyId,
        suggestedLat: preview.suggestedLat,
        suggestedLon: preview.suggestedLon,
      }));

    if (applyItems.length === 0) {
      return;
    }

    setGeocodeApplying(true);
    try {
      const applyRes = await applyApprovedGeocodes({ items: applyItems });
      if (!applyRes.ok) {
        toast.error(applyRes.error);
        return;
      }

      const failed = applyRes.results.filter((r) => !r.ok).length;
      const ok = applyRes.results.length - failed;
      if (failed > 0) {
        toast.success(`${String(ok)} übernommen, ${String(failed)} fehlgeschlagen.`);
      } else {
        toast.success(`${String(ok)} Koordinaten übernommen.`);
      }

      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      setRowSelection({});
      setGeocodeModalOpen(false);
      setGeocodePreviewRows([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Übernahme fehlgeschlagen.";
      toast.error(message);
    } finally {
      setGeocodeApplying(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    try {
      await bulkDeleteCompaniesWithTrash(selectedIds);

      toast.success(t("toastBulkDeleted", { count: selectedIds.length }));
      queryClient.refetchQueries({ queryKey: ["companies"] });
      setRowSelection({});
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      toast.error(t("toastBulkDeleteFailed"), { description: (err as Error).message });
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    window.dispatchEvent(new CustomEvent("company-imported"));
    toast.success(t("toastImportSuccess"));
  };

  // Live count used by the bulk geocode tooltip so the user knows how many
  // of their selected rows actually have a geocodable address. The full
  // `rowSelection` can include rows whose coords are already set or whose
  // addresses are too incomplete to send to Nominatim.
  const selectedRowIds = useMemo(() => Object.keys(rowSelection), [rowSelection]);
  const geocodableSelectedCount = useMemo(() => {
    if (selectedRowIds.length === 0) return 0;
    const selectedSet = new Set(selectedRowIds);
    let count = 0;
    for (const company of companies) {
      if (selectedSet.has(company.id) && companyNeedsGeocode(company)) {
        count += 1;
      }
    }
    return count;
  }, [companies, selectedRowIds]);

  const companiesListLinkSearch = useMemo(
    () =>
      serializeCompaniesListToSearchParamsString({
        pagination,
        sorting,
        activeFilters,
        columnVisibility,
        waterFilter,
        globalFilter: debouncedGlobalFilter,
      }),
    [pagination, sorting, activeFilters, columnVisibility, waterFilter, debouncedGlobalFilter],
  );

  useEffect(() => {
    if (openCreateFromQuery) {
      setDialogOpen(true);
    }
  }, [openCreateFromQuery]);

  useEffect(() => {
    if (!trashedCompanyRedirect) {
      return;
    }
    toast.message(t("toastTrashedCompany"));
    const next = new URLSearchParams(searchParamsString);
    next.delete("trashedCompany");
    const qs = next.toString();
    router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [trashedCompanyRedirect, router, t, searchParamsString, pathname]);

  return (
    <>
      <GeocodeReviewModal
        open={geocodeModalOpen}
        onOpenChange={(next) => {
          setGeocodeModalOpen(next);
          if (!next) {
            setGeocodePreviewRows([]);
          }
        }}
        rows={geocodePreviewRows}
        isApplying={geocodeApplying}
        onApplySelected={handleApplyCompanyGeocodes}
      />
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("createButtonLabel")}
            </Button>
          </DialogTrigger>
          <WideDialogContent size="2xl">
            <DialogHeader>
              <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            </DialogHeader>
            <CompanyCreateForm onSuccess={() => setDialogOpen(false)} />
          </WideDialogContent>
        </Dialog>
      </div>

      <Suspense fallback={<LoadingState count={8} />}>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("statTotal")}
            value={stats.total.toLocaleString(localeTag)}
            icon={<Building className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={t("statTrend")}
          />
          <StatCard
            title={t("statLeads")}
            value={stats.leads.toLocaleString(localeTag)}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={t("statTrend")}
          />
          <StatCard
            title={t("statWon")}
            value={stats.won.toLocaleString(localeTag)}
            icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={t("statTrend")}
          />
          <StatCard
            title={t("statValue")}
            value={`€${stats.value.toLocaleString(localeTag)}`}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={t("statTrend")}
          />
        </div>

        {/* Table Section */}
        <Card className="border-border rounded-xl shadow-sm">
          <CardContent className="p-6">
            {/* Active Filters Badges */}
            {(() => {
              const totalActiveFilters =
                Object.values(activeFilters).flat().length + (waterFilter ? 1 : 0);
              const waterPreset = waterFilter
                ? WATER_PRESETS.find((p) => p.value === waterFilter)
                : null;
              return (
                <div
                  className={cn(
                    "flex flex-wrap gap-2 items-center",
                    totalActiveFilters === 0 ? "mt-1" : "mt-4",
                  )}
                >
                  {Object.entries(activeFilters).map(([group, values]) =>
                    values.map((v) => (
                      <Badge key={`${group}-${v}`} variant="secondary" className="flex items-center gap-1">
                        {v}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFilter(group as CompaniesFilterGroup, v)}
                        />
                      </Badge>
                    )),
                  )}
                  {waterPreset && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Waves className="h-3 w-3" />
                      {t(waterPreset.labelKey)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setPagination((p) => ({ ...p, pageIndex: 0 }));
                          setWaterFilter(null);
                        }}
                      />
                    </Badge>
                  )}
                  {totalActiveFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPagination((p) => ({ ...p, pageIndex: 0 }));
                        setActiveFilters({
                          status: [],
                          kategorie: [],
                          betriebstyp: [],
                          land: [],
                          wassertyp: [],
                        });
                        setWaterFilter(null);
                        setGlobalFilter("");
                      }}
                    >
                      {t("clearAllFilters")}
                    </Button>
                  )}
                </div>
              );
            })()}

            <Accordion type="single" collapsible className="mb-4">
              <AccordionItem>
                <AccordionTrigger open={accordionOpen} setOpen={setAccordionOpen}>
                  {(() => {
                    const count = Object.values(activeFilters).flat().length + (waterFilter ? 1 : 0);
                    return count > 0
                      ? t("filtersWithCount", { count, total })
                      : t("filters");
                  })()}
                </AccordionTrigger>
                <AccordionContent open={accordionOpen} setOpen={setAccordionOpen}>
                  {/* Status */}
                  <div className="mb-4">
                    <h4 className="font-normal mb-2">{t("filterStatus")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions
                        .filter(
                          (o) =>
                            !distinctFilterValues ||
                            distinctFilterValues.status.has(o.value) ||
                            activeFilters.status.includes(o.value),
                        )
                        .map((option) => {
                        const Icon = statusIcons[option.value];
                        const isActive = activeFilters.status.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={
                              isActive
                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                            }
                            onClick={() => toggleFilter("status", option.value)}
                          >
                            {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kategorie */}
                  <div className="mb-4">
                    <h4 className="font-normal mb-2">{t("filterCategory")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {kundentypOptions
                        .filter(
                          (o) =>
                            !distinctFilterValues ||
                            distinctFilterValues.kundentyp.has(o.value) ||
                            activeFilters.kategorie.includes(o.value),
                        )
                        .map((option) => {
                        const Icon = kategorieIcons[option.value];
                        const isActive = activeFilters.kategorie.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={
                              isActive
                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                            }
                            onClick={() => toggleFilter("kategorie", option.value)}
                          >
                            {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Betriebstyp */}
                  <div className="mb-4">
                    <h4 className="font-normal mb-2">{t("filterBusinessType")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {firmentypOptions
                        .filter(
                          (o) =>
                            !distinctFilterValues ||
                            distinctFilterValues.firmentyp.has(o.value) ||
                            activeFilters.betriebstyp.includes(o.value),
                        )
                        .map((option) => {
                        const isActive = activeFilters.betriebstyp.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={
                              isActive
                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                            }
                            onClick={() => toggleFilter("betriebstyp", option.value)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wasser (distance + type) */}
                  <div className="mb-4">
                    <h4 className="font-normal mb-2">{t("filterWater")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {WATER_PRESETS.map((preset) => {
                        const isActive = waterFilter === preset.value;
                        return (
                          <Button
                            key={preset.value}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={
                              isActive
                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                            }
                            onClick={() => {
                              setPagination((p) => ({ ...p, pageIndex: 0 }));
                              setWaterFilter(isActive ? null : preset.value);
                            }}
                          >
                            <Waves className="mr-1.5 h-3.5 w-3.5" />
                            {t(preset.labelKey)}
                          </Button>
                        );
                      })}
                      {wassertypOptions
                        .filter(
                          (o) =>
                            !distinctFilterValues ||
                            distinctFilterValues.wassertyp.has(o.value) ||
                            activeFilters.wassertyp.includes(o.value),
                        )
                        .map((option) => {
                        const isActive = activeFilters.wassertyp.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={
                              isActive
                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                            }
                            onClick={() => toggleFilter("wassertyp", option.value)}
                          >
                            <Waves className="mr-1.5 h-3.5 w-3.5" />
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Land */}
                  <div>
                    <h4 className="font-normal mb-2">{t("filterCountry")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const dynamicLandOptions = distinctLands.map((land) => ({ value: land, label: land }));
                        return dynamicLandOptions.map((option) => {
                          const isActive = activeFilters.land.includes(option.value);
                          return (
                            <Button
                              key={option.value}
                              variant={isActive ? "secondary" : "ghost"}
                              size="sm"
                              className={
                                isActive
                                  ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                              }
                              onClick={() => toggleFilter("land", option.value)}
                            >
                              {option.label}
                            </Button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <CompaniesTable
              companies={companies}
              totalFilteredCount={total}
              isInitialLoading={companiesInitialLoading}
              isFetching={companiesIsFetching}
              showSemanticBadge={showSemanticBadge}
              globalSearchStrategy={globalSearchStrategyFromApi}
              showSearchModeIndicator={debouncedGlobalFilter.trim().length > 0}
              globalFilter={globalFilter}
              onGlobalFilterChange={handleGlobalFilterChange}
              onEdit={(company) => setEditingCompany(company)}
              onDelete={(companyOrId) => {
                const id = typeof companyOrId === "string" ? companyOrId : companyOrId.id;
                deleteMutation.mutate(id);
              }}
              pageCount={pageCount}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              companiesListSearchParams={companiesListLinkSearch}
              onImportCSV={() => setCsvDialogOpen(true)}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              selectionActions={
                <>
                  {(() => {
                    const selectedCount = selectedRowIds.length;
                    const hasGeocodable = geocodableSelectedCount > 0;
                    const tooltipLabel = hasGeocodable
                      ? t("geocodeBulkTooltipReady", {
                          geocodable: geocodableSelectedCount,
                          selected: selectedCount,
                        })
                      : t("geocodeBulkTooltipNone");
                    const geocodeButton = (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={tooltipLabel}
                        disabled={geocodeLoading || !hasGeocodable}
                        onClick={() => void handleBulkGeocodePreview()}
                      >
                        {geocodeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Locate className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    );
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* Wrap in span so the tooltip still opens while the button is disabled */}
                          <span className="inline-flex">{geocodeButton}</span>
                        </TooltipTrigger>
                        <TooltipContent>{tooltipLabel}</TooltipContent>
                      </Tooltip>
                    );
                  })()}
                  <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" title={t("deleteSelectedTitle")}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("bulkDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("bulkDeleteDescription", { count: Object.keys(rowSelection).length })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>{t("delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              }
            />
          </CardContent>
        </Card>
      </Suspense>

      {editingCompany && (
        <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
          <WideDialogContent size="2xl">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <CompanyEditForm
              company={editingCompany}
              onSuccess={() => {
                setEditingCompany(null);
                queryClient.invalidateQueries({ queryKey: ["companies"] });
              }}
            />
          </WideDialogContent>
        </Dialog>
      )}

      <CSVImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onSuccess={handleImportSuccess} />
    </>
  );
}

export default ClientCompaniesPage;
