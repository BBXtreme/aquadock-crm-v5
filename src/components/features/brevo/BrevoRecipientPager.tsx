"use client";

import type { Table } from "@tanstack/react-table";

import type { BrevoContactWithCompany } from "@/types/brevo";

type BrevoRecipientPagerProps = {
  table: Table<BrevoContactWithCompany>;
  isPending: boolean;
};

export function BrevoRecipientPager({ table, isPending }: BrevoRecipientPagerProps) {
  const selected = table.getFilteredSelectedRowModel().rows.length;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {isPending ? "…" : `${selected} of ${total} row(s) selected.`}
      </div>
      <div className="space-x-2">
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => table.previousPage()}
          disabled={isPending || !table.getCanPreviousPage()}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => table.nextPage()}
          disabled={isPending || !table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
}
