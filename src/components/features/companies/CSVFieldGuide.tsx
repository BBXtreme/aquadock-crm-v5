"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { csvImportNotYetImportedRows, csvImportParserFieldRows } from "@/lib/constants/csv-import-fields";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

/**
 * Full-viewport CSV UI (preview + field guide): above app chrome (Header/Sidebar use z-50),
 * tooltips/menus (z-50), and typical dialogs. Opaque overlay so the shell is not visible through dim layers.
 */
export const csvImportFullscreenOverlayClassName = cn(
  "z-10000 bg-background",
);

export const csvImportFullscreenDialogContentClassName = cn(
  "fixed inset-0 top-0 left-0 z-10001 flex h-dvh max-h-dvh w-screen max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none ring-0 duration-200 sm:max-w-none",
  "data-open:zoom-in-100 data-closed:zoom-out-100",
);

/** Matches CSV import dialog header/tabs horizontal padding (px-6). */
export const csvImportTabPanelClassName =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 py-3";

/** Scrollable tab body (e.g. field reference). */
export const csvImportTabPanelScrollClassName =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-6 py-3";

/** Sticky shadcn-style header cells for scrollable import tables. */
export const csvImportStickyTableHeadClassName =
  "sticky top-0 z-10 border-b border-border/60 bg-muted/95 backdrop-blur-sm";

export interface CSVFieldGuideProps {
  /** Larger typography and spacing when the guide uses the full viewport. */
  spacious?: boolean;
}

type TranslatedFieldRow = {
  label: string;
  recommendedHeader: string;
  acceptedHeaders: readonly string[];
  example: string;
  dataType: string;
  required: boolean;
  notes: string;
};

type CsvImportTranslate = ReturnType<typeof useT<"csvImport">>;
type CommonTranslate = ReturnType<typeof useT<"common">>;

function GuideTableSection({
  title,
  description,
  rows,
  rowKeys,
  spacious,
  t,
  tCommon,
  onCopyHeader,
}: {
  title: string;
  description?: string;
  rows: TranslatedFieldRow[];
  rowKeys: string[];
  spacious: boolean;
  t: CsvImportTranslate;
  tCommon: CommonTranslate;
  onCopyHeader: (label: string, header: string) => void;
}) {
  return (
    <div className={cn("space-y-3", spacious && "space-y-4")}>
      <div>
        <h3 className={cn("font-heading font-medium text-foreground", spacious ? "text-base" : "text-sm")}>
          {title}
        </h3>
        {description ? (
          <p className={cn("mt-1 text-muted-foreground", spacious ? "text-sm" : "text-xs")}>{description}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className={cn("min-w-[720px]", spacious ? "text-base" : "text-sm")}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className={cn("w-[140px] whitespace-nowrap", spacious && csvImportStickyTableHeadClassName)}
              >
                {t("tableField")}
              </TableHead>
              <TableHead
                className={cn("w-[130px] whitespace-nowrap", spacious && csvImportStickyTableHeadClassName)}
              >
                {t("tableRecommendedHeader")}
              </TableHead>
              <TableHead className={cn(spacious && csvImportStickyTableHeadClassName)}>{t("tableAcceptedVariants")}</TableHead>
              <TableHead
                className={cn("w-[100px] whitespace-nowrap", spacious && csvImportStickyTableHeadClassName)}
              >
                {t("tableExample")}
              </TableHead>
              <TableHead
                className={cn("w-[70px] whitespace-nowrap", spacious && csvImportStickyTableHeadClassName)}
              >
                {t("tableRequired")}
              </TableHead>
              <TableHead className={cn(spacious && csvImportStickyTableHeadClassName)}>{t("tableNotes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={rowKeys[index]}>
                <TableCell className="align-top font-medium">{row.label}</TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center gap-1">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-sans text-xs font-medium tracking-tight">
                      {row.recommendedHeader}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => onCopyHeader(row.label, row.recommendedHeader)}
                      aria-label={t("copyHeaderAria", { header: row.recommendedHeader })}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="align-top text-muted-foreground text-xs leading-relaxed">
                  {row.acceptedHeaders.join(", ")}
                </TableCell>
                <TableCell className="align-top text-xs">{row.example}</TableCell>
                <TableCell className="align-top text-xs">{row.required ? t("requiredYes") : t("requiredNo")}</TableCell>
                <TableCell className="align-top text-muted-foreground text-xs leading-relaxed">
                  {row.notes.trim() ? row.notes : tCommon("dash")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CSVFieldGuide({ spacious = false }: CSVFieldGuideProps) {
  const t = useT("csvImport");
  const tCommon = useT("common");

  const copyHeader = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("toastHeaderCopied"), { description: text });
    } catch {
      toast.error(t("toastCopyFailedTitle"), { description: label });
    }
  };

  const parserRows: TranslatedFieldRow[] = csvImportParserFieldRows.map((row) => ({
    label: t(`fields.${row.internalKey}.label`),
    recommendedHeader: row.recommendedHeader,
    acceptedHeaders: row.acceptedHeaders,
    example: row.example,
    dataType: t(`fields.${row.internalKey}.dataType`),
    required: row.required,
    notes: t(`fields.${row.internalKey}.notes`),
  }));

  const futureRows: TranslatedFieldRow[] = csvImportNotYetImportedRows.map((row) => ({
    label: t(`futureFields.${row.id}.label`),
    recommendedHeader: row.recommendedHeader,
    acceptedHeaders: row.acceptedHeaders,
    example: row.example,
    dataType: t(`futureFields.${row.id}.dataType`),
    required: row.required,
    notes: t(`futureFields.${row.id}.notes`),
  }));

  const parserKeys = csvImportParserFieldRows.map((r) => `csv-guide-parser-${r.internalKey}`);
  const futureKeys = csvImportNotYetImportedRows.map((r) => `csv-guide-future-${r.id}`);

  return (
    <div className={cn("space-y-8", spacious && "space-y-10")}>
      <Alert>
        <AlertTitle>{t("formatAlertTitle")}</AlertTitle>
        <AlertDescription
          className={cn("text-muted-foreground leading-relaxed", spacious ? "text-sm" : "text-xs")}
        >
          {t("formatAlertDescription")}
        </AlertDescription>
      </Alert>

      <GuideTableSection
        title={t("sectionParserTitle")}
        description={t("sectionParserDescription")}
        rows={parserRows}
        rowKeys={parserKeys}
        spacious={spacious}
        t={t}
        tCommon={tCommon}
        onCopyHeader={(label, header) => {
          void copyHeader(label, header);
        }}
      />

      <GuideTableSection
        title={t("sectionFutureTitle")}
        description={t("sectionFutureDescription")}
        rows={futureRows}
        rowKeys={futureKeys}
        spacious={spacious}
        t={t}
        tCommon={tCommon}
        onCopyHeader={(label, header) => {
          void copyHeader(label, header);
        }}
      />
    </div>
  );
}
