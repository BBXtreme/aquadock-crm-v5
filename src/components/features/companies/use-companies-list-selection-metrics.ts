"use client";

import { useMemo } from "react";
import { companyNeedsGeocode } from "@/components/features/companies/client-companies-constants";
import type { Company } from "@/types/database.types";

export function useCompaniesListSelectionMetrics(rowSelection: Record<string, boolean>, companies: Company[]) {
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

  return { selectedRowIds, geocodableSelectedCount };
}
