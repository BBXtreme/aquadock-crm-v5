"use client";

import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";
import type { BrevoContactWithCompany } from "@/types/brevo";

type BrevoRecipientPagerProps = {
  table: Table<BrevoContactWithCompany>;
  isPending: boolean;
};

export function BrevoRecipientPager({ table, isPending }: BrevoRecipientPagerProps) {
  const t = useT("brevo");
  const selected = table.getFilteredSelectedRowModel().rows.length;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {isPending ? "…" : t("recipientPagerSelection", { selected, total })}
      </div>
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={isPending || !table.getCanPreviousPage()}
        >
          {t("recipientPagerPrev")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={isPending || !table.getCanNextPage()}
        >
          {t("recipientPagerNext")}
        </Button>
      </div>
    </div>
  );
}
