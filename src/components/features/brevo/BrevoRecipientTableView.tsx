"use client";

import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";

import { BrevoRecipientDataRows } from "@/components/features/brevo/BrevoRecipientDataRows";
import { BrevoRecipientSkeletonRows } from "@/components/features/brevo/BrevoRecipientSkeletonRows";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrevoContactWithCompany } from "@/types/brevo";

type BrevoRecipientTableViewProps = {
  table: TanstackTable<BrevoContactWithCompany>;
  isPending: boolean;
};

export function BrevoRecipientTableView({ table, isPending }: BrevoRecipientTableViewProps) {
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      {isPending ? <BrevoRecipientSkeletonRows /> : <BrevoRecipientDataRows table={table} />}
    </Table>
  );
}
