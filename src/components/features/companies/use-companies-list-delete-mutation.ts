"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import type { WaterPreset } from "@/components/features/companies/client-companies-constants";
import { deleteCompany } from "@/lib/actions/companies";
import { restoreCompanyWithTrash } from "@/lib/actions/crm-trash";
import type { SearchCompaniesListResult } from "@/lib/server/companies-search";
import type { CompaniesFilterGroup } from "@/lib/utils/company-filters-url-state";

type ListPagination = { pageIndex: number; pageSize: number };

type ListSorting = { id: string; desc: boolean }[];

type ActiveFilters = Record<CompaniesFilterGroup, string[]>;

type CompaniesT = ReturnType<typeof useTranslations<"companies">>;

export function useCompaniesListDeleteMutation(options: {
  pagination: ListPagination;
  activeFilters: ActiveFilters;
  waterFilter: WaterPreset | null;
  sorting: ListSorting;
  sortExplicit: boolean;
  debouncedGlobalFilter: string;
  t: CompaniesT;
}) {
  const { pagination, activeFilters, waterFilter, sorting, sortExplicit, debouncedGlobalFilter, t } = options;
  const queryClient = useQueryClient();

  const listQueryKey = useMemo(
    () =>
      [
        "companies",
        pagination.pageIndex,
        pagination.pageSize,
        activeFilters,
        waterFilter,
        sorting,
        sortExplicit,
        debouncedGlobalFilter,
      ] as const,
    [
      pagination.pageIndex,
      pagination.pageSize,
      activeFilters,
      waterFilter,
      sorting,
      sortExplicit,
      debouncedGlobalFilter,
    ],
  );

  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onMutate: async (id) => {
      const queryKey = [...listQueryKey];
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
}
