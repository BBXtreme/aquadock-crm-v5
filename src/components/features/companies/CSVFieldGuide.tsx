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
import { cn } from "@/lib/utils";

/**
 * Full-viewport CSV UI (preview + field guide): above app chrome (Header/Sidebar use z-50),
 * tooltips/menus (z-50), and typical dialogs. Opaque overlay so the shell is not visible through dim layers.
 */
export const csvImportFullscreenOverlayClassName = cn(
  "z-[10000] bg-background",
);

export const csvImportFullscreenDialogContentClassName = cn(
  "fixed inset-0 top-0 left-0 z-[10001] flex h-dvh max-h-dvh w-screen max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none ring-0 duration-200 sm:max-w-none",
  "data-open:zoom-in-100 data-closed:zoom-out-100",
);

export interface CSVFieldGuideProps {
  /** Larger typography and spacing when the guide uses the full viewport. */
  spacious?: boolean;
}

async function copyHeader(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Header kopiert", { description: text });
  } catch {
    toast.error("Kopieren fehlgeschlagen", { description: label });
  }
}

function GuideTableSection({
  title,
  description,
  rows,
  rowKeys,
  spacious,
}: {
  title: string;
  description?: string;
  rows: readonly {
    labelDe: string;
    recommendedHeader: string;
    acceptedHeaders: readonly string[];
    example: string;
    dataType: string;
    required: boolean;
    notesDe: string;
  }[];
  rowKeys: string[];
  spacious: boolean;
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
              <TableHead className="w-[140px] whitespace-nowrap">Feld</TableHead>
              <TableHead className="w-[130px] whitespace-nowrap">Empfohlener Header</TableHead>
              <TableHead>Akzeptierte Varianten</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Beispiel</TableHead>
              <TableHead className="w-[70px] whitespace-nowrap">Pflicht</TableHead>
              <TableHead>Hinweise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={rowKeys[index]}>
                <TableCell className="align-top font-medium">{row.labelDe}</TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center gap-1">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.recommendedHeader}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => copyHeader(row.labelDe, row.recommendedHeader)}
                      aria-label={`Header ${row.recommendedHeader} kopieren`}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="align-top text-muted-foreground text-xs leading-relaxed">
                  {row.acceptedHeaders.join(", ")}
                </TableCell>
                <TableCell className="align-top text-xs">{row.example}</TableCell>
                <TableCell className="align-top text-xs">{row.required ? "Ja" : "Nein"}</TableCell>
                <TableCell className="align-top text-muted-foreground text-xs leading-relaxed">{row.notesDe || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CSVFieldGuide({ spacious = false }: CSVFieldGuideProps) {
  const parserKeys = csvImportParserFieldRows.map((r) => `csv-guide-parser-${r.internalKey}`);
  const futureKeys = csvImportNotYetImportedRows.map((r) => `csv-guide-future-${r.id}`);

  return (
    <div className={cn("space-y-8", spacious && "space-y-10")}>
      <Alert>
        <AlertTitle>CSV-Format</AlertTitle>
        <AlertDescription
          className={cn("text-muted-foreground leading-relaxed", spacious ? "text-sm" : "text-xs")}
        >
          Trennzeichen: Semikolon (;). Erste Zeile enthält die Spaltenüberschriften. Groß-/Kleinschreibung ist
          egal; Leerzeichen am Rand werden entfernt. Pro Zeile werden nur Zeilen mit Firmenname und Kundentyp
          importiert.
        </AlertDescription>
      </Alert>

      <GuideTableSection
        title="Vom Importer erkannt"
        description="Diese Spalten werden eingelesen und in der Vorschau sowie beim Import verwendet."
        rows={csvImportParserFieldRows}
        rowKeys={parserKeys}
        spacious={spacious}
      />

      <GuideTableSection
        title="Noch nicht aus CSV übernommen"
        description="Die folgenden Spalten können Sie in Exporten sehen oder vorbereiten — der aktuelle Unternehmens-CSV-Import ignoriert sie."
        rows={csvImportNotYetImportedRows}
        rowKeys={futureKeys}
        spacious={spacious}
      />
    </div>
  );
}
