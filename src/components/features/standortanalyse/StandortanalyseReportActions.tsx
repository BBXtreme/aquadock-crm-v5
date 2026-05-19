"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";

type StandortanalyseReportActionsProps = {
  onDownload: () => void;
  onPrint: () => void;
  isExporting: boolean;
  className?: string;
};

export function StandortanalyseReportActions({
  onDownload,
  onPrint,
  isExporting,
  className,
}: StandortanalyseReportActionsProps) {
  const t = useT("standortanalyse");

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button
          type="button"
          onClick={onDownload}
          disabled={isExporting}
          aria-busy={isExporting}
          className="w-full sm:w-auto"
        >
          <FileDown className="h-4 w-4" aria-hidden />
          {isExporting ? t("exportInProgress") : t("exportPdf")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onPrint}
          disabled={isExporting}
          className="w-full sm:w-auto"
        >
          <Printer className="h-4 w-4" aria-hidden />
          {t("exportPrint")}
        </Button>
      </div>
    </div>
  );
}
