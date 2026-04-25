"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import { bulkDeleteCompaniesWithTrash } from "@/lib/actions/crm-trash";

type CompaniesT = ReturnType<typeof useTranslations<"companies">>;

export function useCompaniesBulkDelete(options: {
  rowSelection: Record<string, boolean>;
  setRowSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
  setBulkDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  queryClient: QueryClient;
  t: CompaniesT;
}) {
  const { rowSelection, setRowSelection, setBulkDeleteDialogOpen, queryClient, t } = options;

  return useCallback(async () => {
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
  }, [rowSelection, setRowSelection, setBulkDeleteDialogOpen, queryClient, t]);
}
