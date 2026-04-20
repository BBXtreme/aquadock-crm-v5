"use client";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { buildBrevoRecipientColumns } from "@/components/features/brevo/brevo-recipient-columns";
import { useBrevoRecipientRowSelection } from "@/components/features/brevo/use-brevo-recipient-row-selection";
import { useT } from "@/lib/i18n/use-translations";
import type { BrevoContactWithCompany } from "@/types/brevo";

export type BrevoRecipientTableFilters = {
  globalFilter: string;
  setGlobalFilter: OnChangeFn<string>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: OnChangeFn<ColumnFiltersState>;
};

export function useBrevoRecipientTable(
  contacts: BrevoContactWithCompany[],
  filters: BrevoRecipientTableFilters,
  setSelectedRecipients: (recipients: string[]) => void,
) {
  const { rowSelection, onRowSelectionChange } = useBrevoRecipientRowSelection(setSelectedRecipients);

  const { globalFilter, setGlobalFilter, columnFilters, setColumnFilters } = filters;
  const t = useT("brevo");
  const columns = useMemo(
    () => buildBrevoRecipientColumns((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );

  return useReactTable({
    data: contacts,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: {
      rowSelection,
      globalFilter,
      columnFilters,
    },
  });
}
