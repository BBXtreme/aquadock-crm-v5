"use client";

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building, DollarSign, Loader2, MapPin, Plus, Trash, Trophy, Users, Waves, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { Company, Contact } from "@/types/database.types";

type FilterGroup = "status" | "kategorie" | "betriebstyp" | "land" | "wassertyp";

type WaterPreset = "at" | "le100" | "le500" | "le1km" | "gt1km";

type CompanyWithContacts = Company & { contacts?: Contact[] };

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
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "firmenname", desc: false }]);

  const [activeFilters, setActiveFilters] = useState<Record<FilterGroup, string[]>>({
    status: [],
    kategorie: [],
    betriebstyp: [],
    land: [],
    wassertyp: [],
  });
  const [waterFilter, setWaterFilter] = useState<WaterPreset | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [_bulkAiEnrichPending, setBulkAiEnrichPending] = useState(false);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);

  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

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

  const toggleFilter = (group: FilterGroup, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(value) ? prev[group].filter((v) => v !== value) : [...prev[group], value],
    }));
  };

  const removeFilter = (group: FilterGroup, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].filter((v) => v !== value),
    }));
  };

  const companiesData = useSuspenseQuery({
    queryKey: [
      "companies",
      pagination.pageIndex,
      pagination.pageSize,
      activeFilters,
      waterFilter,
      sorting,
      debouncedGlobalFilter,
    ],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("companies")
        .select(
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
        )
        .is("deleted_at", null);

      // Apply global filter
      if (debouncedGlobalFilter) {
        query = query.or(
          `firmenname.ilike.%${debouncedGlobalFilter}%,strasse.ilike.%${debouncedGlobalFilter}%,stadt.ilike.%${debouncedGlobalFilter}%`,
        );
      }

      // Apply active filters
      if (activeFilters.status.length > 0) {
        query = query.in("status", activeFilters.status);
      }
      if (activeFilters.kategorie.length > 0) {
        query = query.in("kundentyp", activeFilters.kategorie);
      }
      if (activeFilters.betriebstyp.length > 0) {
        query = query.in("firmentyp", activeFilters.betriebstyp);
      }
      if (activeFilters.land.length > 0) {
        query = query.in("land", activeFilters.land);
      }
      if (activeFilters.wassertyp.length > 0) {
        query = query.in("wassertyp", activeFilters.wassertyp);
      }

      if (waterFilter) {
        switch (waterFilter) {
          case "at":
            query = query.eq("wasserdistanz", 0);
            break;
          case "le100":
            query = query.lte("wasserdistanz", 100);
            break;
          case "le500":
            query = query.lte("wasserdistanz", 500);
            break;
          case "le1km":
            query = query.lte("wasserdistanz", 1000);
            break;
          case "gt1km":
            query = query.gt("wasserdistanz", 1000);
            break;
        }
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        if (sort) {
          query = query.order(sort.id, { ascending: !sort.desc });
        }
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      const raw = data ?? [];
      const companies = raw.map((row) => ({
        ...row,
        contacts: (row.contacts ?? []).filter(
          (ct: { deleted_at?: string | null }) => ct.deleted_at == null,
        ),
      })) as CompanyWithContacts[];
      return { companies, totalCount: count ?? 0 };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    gcTime: 5 * 60 * 1000,
  });

  const companies = companiesData.data.companies;
  const total = companiesData.data.totalCount;
  const pageCount = Math.ceil(total / pagination.pageSize);

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
        debouncedGlobalFilter,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<{ companies: CompanyWithContacts[]; totalCount: number }>(
        queryKey,
      );
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
        previousCompanies?: { companies: CompanyWithContacts[]; totalCount: number };
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
        debouncedGlobalFilter,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<{ companies: CompanyWithContacts[]; totalCount: number }>(
        queryKey,
      );
      if (previousCompanies) {
        queryClient.setQueryData(queryKey, {
          companies: previousCompanies.companies.filter((company) => company.id !== id),
          totalCount: previousCompanies.totalCount - 1,
        });
      }
      return { previousCompanies, queryKey };
    },
    onError: (err, _id, context) => {
      const ctx = context as {
        previousCompanies?: { companies: CompanyWithContacts[]; totalCount: number };
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

  const searchParams = useSearchParams();
  const openCreateFromQuery = searchParams.get("create") === "true";
  const trashedCompanyRedirect = searchParams.get("trashedCompany") === "1";

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
    router.replace("/companies", { scroll: false });
  }, [trashedCompanyRedirect, router, t]);

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
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(group as FilterGroup, v)} />
                      </Badge>
                    )),
                  )}
                  {waterPreset && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Waves className="h-3 w-3" />
                      {t(waterPreset.labelKey)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setWaterFilter(null)} />
                    </Badge>
                  )}
                  {totalActiveFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveFilters({
                          status: [],
                          kategorie: [],
                          betriebstyp: [],
                          land: [],
                          wassertyp: [],
                        });
                        setWaterFilter(null);
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
                            onClick={() => setWaterFilter(isActive ? null : preset.value)}
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
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onEdit={(company) => setEditingCompany(company)}
              onDelete={(companyOrId) => {
                const id = typeof companyOrId === "string" ? companyOrId : companyOrId.id;
                deleteMutation.mutate(id);
              }}
              pageCount={pageCount}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              onImportCSV={() => setCsvDialogOpen(true)}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              selectionActions={
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title="Koordinaten vervollständigen"
                    disabled={geocodeLoading || Object.keys(rowSelection).length === 0}
                    onClick={() => void handleBulkGeocodePreview()}
                  >
                    {geocodeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <MapPin className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
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
