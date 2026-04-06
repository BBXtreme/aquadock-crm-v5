// src/components/features/brevo/brevo-recipient-columns.tsx
"use client";

import { createColumnHelper, type TableOptions } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { BrevoContactWithCompany } from "@/types/brevo";

const columnHelper = createColumnHelper<BrevoContactWithCompany>();

/** Typed as table `columns` option so mixed accessors stay compatible with TanStack v8. */
export const brevoRecipientColumns: TableOptions<BrevoContactWithCompany>["columns"] = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  }),
  columnHelper.accessor("vorname", {
    header: "Vorname",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("nachname", {
    header: "Nachname",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor((row) => row.companies?.kundentyp ?? "", {
    id: "companies.kundentyp",
    header: "Kundentyp",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor((row) => row.companies?.status ?? "", {
    id: "companies.status",
    header: "Status",
    cell: (info) => info.getValue() || "",
  }),
];

export const BREVO_RECIPIENT_COLUMN_COUNT = brevoRecipientColumns.length;
