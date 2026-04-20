"use client";

import { flexRender, type Table } from "@tanstack/react-table";

import { BREVO_RECIPIENT_COLUMN_COUNT } from "@/components/features/brevo/brevo-recipient-columns";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/use-translations";
import type { BrevoContactWithCompany } from "@/types/brevo";

type BrevoRecipientDataRowsProps = {
  table: Table<BrevoContactWithCompany>;
};

export function BrevoRecipientDataRows({ table }: BrevoRecipientDataRowsProps) {
  const t = useT("brevo");
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={BREVO_RECIPIENT_COLUMN_COUNT} className="h-24 text-center">
            {t("recipientEmpty")}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
