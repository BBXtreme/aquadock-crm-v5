"use client";

import type { ColumnFiltersState } from "@tanstack/react-table";
import { useCallback, useState } from "react";

import { BREVO_RECIPIENT_FILTER_ALL } from "@/components/features/brevo/brevo-recipient-constants";

export function useBrevoRecipientFilters() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const setKundentypFilter = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== "companies.kundentyp");
      if (value === BREVO_RECIPIENT_FILTER_ALL) return rest;
      return [...rest, { id: "companies.kundentyp", value }];
    });
  }, []);

  const setStatusFilter = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== "companies.status");
      if (value === BREVO_RECIPIENT_FILTER_ALL) return rest;
      return [...rest, { id: "companies.status", value }];
    });
  }, []);

  const kundentypValue =
    (columnFilters.find((f) => f.id === "companies.kundentyp")?.value as string | undefined) ??
    BREVO_RECIPIENT_FILTER_ALL;

  const statusValue =
    (columnFilters.find((f) => f.id === "companies.status")?.value as string | undefined) ??
    BREVO_RECIPIENT_FILTER_ALL;

  return {
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    kundentypValue,
    statusValue,
    setKundentypFilter,
    setStatusFilter,
  };
}
