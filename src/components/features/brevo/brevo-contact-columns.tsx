// src/components/features/brevo/brevo-contact-columns.tsx
"use client";

import type { FilterFn } from "@tanstack/react-table";
import { createColumnHelper, type TableOptions } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { safeDisplay } from "@/lib/utils/data-format";
import type { Contact } from "@/types/database.types";

type BrevoRoot = typeof import("@/messages/de.json");
type BrevoMessageKey = keyof BrevoRoot["brevo"] & string;

/** Row shape for Brevo sync table (contacts + joined company fields). */
export type BrevoContactSyncRow = Contact & {
  companies: {
    firmenname: string;
    kundentyp: string;
    status: string;
  } | null;
};

const columnHelper = createColumnHelper<BrevoContactSyncRow>();

function labelFromOptions(
  value: string,
  options: { value: string; label: string }[],
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  const found = options.find((o) => o.value === value);
  return found?.label ?? value;
}

export const brevoContactSyncGlobalFilterFn: FilterFn<BrevoContactSyncRow> = (
  row,
  _columnId,
  filterValue,
) => {
  const q = String(filterValue ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const r = row.original;
  const c = r.companies;
  const haystack = [
    r.vorname,
    r.nachname,
    r.email,
    r.telefon,
    c?.firmenname,
    c?.kundentyp,
    c?.status,
  ]
    .map((x) => (x != null ? String(x).toLowerCase() : ""))
    .join(" ");
  return haystack.includes(q);
};

function multiSelectCompanyFieldFilter(getRaw: (row: BrevoContactSyncRow) => string): FilterFn<BrevoContactSyncRow> {
  return (row, _columnId, filterValue) => {
    const selected = filterValue as string[] | undefined;
    if (!selected || selected.length === 0) return true;
    const v = getRaw(row.original);
    return selected.includes(v);
  };
}

/** Build column defs with `useT("brevo")` and `tCommon("dash")` for the empty marker. */
export function buildBrevoContactSyncColumns(
  t: (key: BrevoMessageKey, values?: Record<string, string | number>) => string,
  dash: string,
): TableOptions<BrevoContactSyncRow>["columns"] {
  return [
    columnHelper.display({
      id: "select",
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("syncSelectAllPageAria")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("syncSelectRowAria")}
        />
      ),
    }),
    columnHelper.accessor("vorname", {
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColVorname")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => safeDisplay(info.getValue()),
    }),
    columnHelper.accessor("nachname", {
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColNachname")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => safeDisplay(info.getValue()),
    }),
    columnHelper.accessor("email", {
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColEmail")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => safeDisplay(info.getValue()),
    }),
    columnHelper.accessor((row: BrevoContactSyncRow) => row.companies?.firmenname ?? "", {
      id: "firmenname",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColFirma")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => safeDisplay(info.getValue() || null),
    }),
    columnHelper.accessor((row: BrevoContactSyncRow) => row.companies?.kundentyp ?? "", {
      id: "companies.kundentyp",
      filterFn: multiSelectCompanyFieldFilter((r) => r.companies?.kundentyp ?? ""),
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColKundentyp")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => labelFromOptions(info.getValue(), kundentypOptions, dash),
    }),
    columnHelper.accessor((row: BrevoContactSyncRow) => row.companies?.status ?? "", {
      id: "companies.status",
      filterFn: multiSelectCompanyFieldFilter((r) => r.companies?.status ?? ""),
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColStatus")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => labelFromOptions(info.getValue(), statusOptions, dash),
    }),
    columnHelper.accessor("telefon", {
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 h-8 gap-1 px-3 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("syncColTelefon")}
          <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      ),
      cell: (info) => safeDisplay(info.getValue()),
    }),
  ];
}

export const BREVO_CONTACT_SYNC_COLUMN_COUNT = 8;

/** Stable React keys for loading skeleton rows (avoid index-only keys). */
export const BREVO_CONTACT_SYNC_SKELETON_ROW_KEYS = [
  "brevo-contact-sync-row-1",
  "brevo-contact-sync-row-2",
  "brevo-contact-sync-row-3",
  "brevo-contact-sync-row-4",
  "brevo-contact-sync-row-5",
] as const;

export const BREVO_CONTACT_SYNC_SKELETON_COL_KEYS = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
] as const;
