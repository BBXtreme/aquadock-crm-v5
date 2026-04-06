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

/** Row shape for Brevo sync table (contacts + joined company fields). */
export type BrevoContactSyncRow = Contact & {
  companies: {
    firmenname: string;
    kundentyp: string;
    status: string;
  } | null;
};

const columnHelper = createColumnHelper<BrevoContactSyncRow>();

function labelFromOptions(value: string, options: { value: string; label: string }[]): string {
  if (!value) return "—";
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

/** Typed as table `columns` option so mixed accessors stay compatible with TanStack v8. */
export const brevoContactSyncColumns: TableOptions<BrevoContactSyncRow>["columns"] = [
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
        aria-label="Alle auf dieser Seite auswählen"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zeile auswählen"
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
        Vorname
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
        Nachname
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
        E-Mail
        <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
      </Button>
    ),
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor((row) => row.companies?.firmenname ?? "", {
    id: "firmenname",
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 gap-1 px-3 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Firmenname
        <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
      </Button>
    ),
    cell: (info) => safeDisplay(info.getValue() || null),
  }),
  columnHelper.accessor((row) => row.companies?.kundentyp ?? "", {
    id: "companies.kundentyp",
    filterFn: multiSelectCompanyFieldFilter((r) => r.companies?.kundentyp ?? ""),
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 gap-1 px-3 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Kundentyp
        <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
      </Button>
    ),
    cell: (info) => labelFromOptions(info.getValue(), kundentypOptions),
  }),
  columnHelper.accessor((row) => row.companies?.status ?? "", {
    id: "companies.status",
    filterFn: multiSelectCompanyFieldFilter((r) => r.companies?.status ?? ""),
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 gap-1 px-3 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
      </Button>
    ),
    cell: (info) => labelFromOptions(info.getValue(), statusOptions),
  }),
  columnHelper.accessor("telefon", {
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 gap-1 px-3 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Telefon
        <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
      </Button>
    ),
    cell: (info) => safeDisplay(info.getValue()),
  }),
];

export const BREVO_CONTACT_SYNC_COLUMN_COUNT = brevoContactSyncColumns.length;

/** Stable React keys for loading skeleton rows (avoid index-only keys). */
export const BREVO_CONTACT_SYNC_SKELETON_ROW_KEYS = [
  "brevo-contact-sync-row-1",
  "brevo-contact-sync-row-2",
  "brevo-contact-sync-row-3",
  "brevo-contact-sync-row-4",
  "brevo-contact-sync-row-5",
  "brevo-contact-sync-row-6",
] as const;

/** Must stay aligned with `brevoContactSyncColumns` order and count. */
export const BREVO_CONTACT_SYNC_SKELETON_COL_KEYS = [
  "select",
  "vorname",
  "nachname",
  "email",
  "firmenname",
  "companies.kundentyp",
  "companies.status",
  "telefon",
] as const;
