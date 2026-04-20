// src/components/features/brevo/brevo-recipient-columns.tsx
"use client";

import { createColumnHelper, type TableOptions } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { BrevoContactWithCompany } from "@/types/brevo";

const columnHelper = createColumnHelper<BrevoContactWithCompany>();

type BrevoRecipientColumnTranslator = (key: string) => string;

/** Typed as table `columns` option so mixed accessors stay compatible with TanStack v8. */
export function buildBrevoRecipientColumns(
  t: BrevoRecipientColumnTranslator,
): TableOptions<BrevoContactWithCompany>["columns"] {
  return [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label={t("recipientSelectAllAria")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("recipientSelectRowAria")}
        />
      ),
    }),
    columnHelper.accessor("vorname", {
      header: t("recipientColVorname"),
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("nachname", {
      header: t("recipientColNachname"),
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("email", {
      header: t("recipientColEmail"),
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row: BrevoContactWithCompany) => row.companies?.kundentyp ?? "", {
      id: "companies.kundentyp",
      header: t("recipientColKundentyp"),
      cell: (info) => info.getValue() || "",
    }),
    columnHelper.accessor((row: BrevoContactWithCompany) => row.companies?.status ?? "", {
      id: "companies.status",
      header: t("recipientColStatus"),
      cell: (info) => info.getValue() || "",
    }),
  ];
}

export const BREVO_RECIPIENT_COLUMN_COUNT = 6;
