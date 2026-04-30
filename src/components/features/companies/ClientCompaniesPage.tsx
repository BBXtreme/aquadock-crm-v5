"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { VisibilityState } from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CompaniesKpiGrid } from "@/components/features/companies/CompaniesKpiGrid";
import { CompaniesListFilters } from "@/components/features/companies/CompaniesListFilters";
import { CompaniesPageHeader } from "@/components/features/companies/CompaniesPageHeader";
import { CompaniesTableBulkActions } from "@/components/features/companies/CompaniesTableBulkActions";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import { CSVImportDialog } from "@/components/features/companies/CSVImportDialog";
import type { WaterPreset } from "@/components/features/companies/client-companies-constants";
import { GeocodeReviewModal } from "@/components/features/companies/GeocodeReviewModal";
import { useCompaniesBulkDelete } from "@/components/features/companies/use-companies-bulk-delete";
import { useCompaniesGeocodeBatch } from "@/components/features/companies/use-companies-geocode-batch";
import { useCompaniesListDeepLinkEffects } from "@/components/features/companies/use-companies-list-deep-link-effects";
import { useCompaniesListDeleteMutation } from "@/components/features/companies/use-companies-list-delete-mutation";
import { useCompaniesListQueries } from "@/components/features/companies/use-companies-list-queries";
import { useCompaniesListSelectionMetrics } from "@/components/features/companies/use-companies-list-selection-metrics";
import { useCompaniesListUrlSync } from "@/components/features/companies/use-companies-list-url-sync";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import {
  type CompaniesFilterGroup,
  serializeCompaniesListToSearchParamsString,
} from "@/lib/utils/company-filters-url-state";
import type { Company } from "@/types/database.types";

function ClientCompaniesPage() {
  const t = useT("companies");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ verantwortlich: false, country: false });
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Fast debounce drives the actual query (semantic/hybrid search + TanStack Query key).
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);
  // Slower debounce drives URL + session persistence so typing never feels janky
  // (router.replace on every keystroke is expensive in Next.js App Router).
  const urlDebouncedGlobalFilter = useDebounce(globalFilter, 800);

  const openCreateFromQuery = searchParams.get("create") === "true";
  const trashedCompanyRedirect = searchParams.get("trashedCompany") === "1";

  const searchParamsString = searchParams.toString();

  useCompaniesListUrlSync({
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
  });

  const {
    distinctFilterValues,
    distinctLands,
    companies,
    total,
    globalSearchStrategyFromApi,
    pageCount,
    companiesInitialLoading,
    companiesIsFetching,
    showSemanticBadge,
    stats,
  } = useCompaniesListQueries({
    pagination,
    activeFilters,
    waterFilter,
    sorting,
    sortExplicit,
    debouncedGlobalFilter,
  });

  const deleteMutation = useCompaniesListDeleteMutation({
    pagination,
    activeFilters,
    waterFilter,
    sorting,
    sortExplicit,
    debouncedGlobalFilter,
    t,
  });

  const { selectedRowIds, geocodableSelectedCount } = useCompaniesListSelectionMetrics(rowSelection, companies);

  const { geocodeLoading, handleBulkGeocodePreview, geocodeModalProps } = useCompaniesGeocodeBatch({
    rowSelection,
    companies,
    queryClient,
    setRowSelection,
  });

  const handleBulkDelete = useCompaniesBulkDelete({
    rowSelection,
    setRowSelection,
    setBulkDeleteDialogOpen,
    queryClient,
    t,
  });

  useCompaniesListDeepLinkEffects({
    openCreateFromQuery,
    trashedCompanyRedirect,
    searchParamsString,
    pathname,
    router,
    t,
    setDialogOpen,
  });

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

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    window.dispatchEvent(new CustomEvent("company-imported"));
  };

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

  return (
    <>
      <GeocodeReviewModal {...geocodeModalProps} />
      <CompaniesPageHeader
        breadcrumb={t("breadcrumb")}
        title={t("title")}
        subtitle={t("subtitle")}
        createButtonLabel={t("createButtonLabel")}
        createDialogTitle={t("createDialogTitle")}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        onCreateSuccess={() => setDialogOpen(false)}
      />

      <Suspense fallback={<LoadingState count={8} />}>
        <CompaniesKpiGrid
          localeTag={localeTag}
          statTotal={t("statTotal")}
          statLeads={t("statLeads")}
          statWon={t("statWon")}
          statValue={t("statValue")}
          statTrend={t("statTrend")}
          total={stats.total}
          leads={stats.leads}
          won={stats.won}
          value={stats.value}
        />

        <Card className="border-border rounded-xl shadow-sm">
          <CardContent className="p-6">
            <CompaniesListFilters
              total={total}
              activeFilters={activeFilters}
              waterFilter={waterFilter}
              distinctFilterValues={distinctFilterValues}
              distinctLands={distinctLands}
              accordionOpen={accordionOpen}
              setAccordionOpen={setAccordionOpen}
              setPagination={setPagination}
              removeFilter={removeFilter}
              toggleFilter={toggleFilter}
              setActiveFilters={setActiveFilters}
              setWaterFilter={setWaterFilter}
              setGlobalFilter={setGlobalFilter}
            />

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
                <CompaniesTableBulkActions
                  rowSelection={rowSelection}
                  selectedRowIds={selectedRowIds}
                  geocodableSelectedCount={geocodableSelectedCount}
                  geocodeLoading={geocodeLoading}
                  bulkDeleteDialogOpen={bulkDeleteDialogOpen}
                  onBulkDeleteDialogOpenChange={setBulkDeleteDialogOpen}
                  onBulkGeocodePreview={() => {
                    void handleBulkGeocodePreview();
                  }}
                  onBulkDelete={() => {
                    void handleBulkDelete();
                  }}
                />
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
