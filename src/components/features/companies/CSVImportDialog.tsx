// CSV import: compact dialog for file drop + parse, then fullscreen preview (CSVPreviewView).

"use client";

import { AlertCircle, BookOpen, FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import {
  CSVFieldGuide,
  csvImportFullscreenDialogContentClassName,
  csvImportFullscreenOverlayClassName,
} from "@/components/features/companies/CSVFieldGuide";
import { CSVPreviewView } from "@/components/features/companies/CSVPreviewView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { importCompaniesFromCSV } from "@/lib/actions/companies";
import { bulkResearchCompanyEnrichment } from "@/lib/actions/company-enrichment";
import { useT } from "@/lib/i18n/use-translations";
import { type ParsedCompanyRow, parseCSVFile } from "@/lib/utils/csv-import";
import { parsedCompanyRowsSchema } from "@/lib/validations/csv-import";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: { imported: number; errors: string[] }) => void;
}

export function CSVImportDialog({ open, onOpenChange, onSuccess }: CSVImportDialogProps) {
  const t = useT("csvImport");
  const tCompanies = useT("companies");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCompanyRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiEnrichNewCompanies, setAiEnrichNewCompanies] = useState(false);
  const guideOpenRef = useRef(guideOpen);
  guideOpenRef.current = guideOpen;

  useEffect(() => {
    if (!open) {
      setGuideOpen(false);
      setAiEnrichNewCompanies(false);
      return;
    }
    setPreviewOpen(false);
    setFile(null);
    setParsedRows([]);
    setParseError(null);
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const next = acceptedFiles[0];
    if (next) {
      setFile(next);
      setParsedRows([]);
      setParseError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleParse = async () => {
    if (!file) {
      return;
    }

    setParseError(null);
    setIsParsing(true);
    try {
      const rows = await parseCSVFile(file);
      if (rows.length === 0) {
        setParseError(t("parseErrorNoRows"));
        return;
      }
      setParsedRows(rows);
      onOpenChange(false);
      requestAnimationFrame(() => {
        setPreviewOpen(true);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toastReadErrorFallback");
      setParseError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePreviewCancel = () => {
    setPreviewOpen(false);
    setParsedRows([]);
    setFile(null);
  };

  const handleBackToEdit = () => {
    setPreviewOpen(false);
    setParsedRows([]);
    onOpenChange(true);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      return;
    }

    const validated = parsedCompanyRowsSchema.safeParse(parsedRows);
    if (!validated.success) {
      const msg = validated.error.issues.map((i) => i.message).join("; ");
      toast.error(t("toastValidateErrorTitle"), { description: msg });
      return;
    }

    setIsImporting(true);
    try {
      const result = await importCompaniesFromCSV(validated.data);
      if (result.errors.length > 0 || result.imported === 0) {
        toast.error(t("toastImportFailedTitle"), {
          description:
            result.errors.length > 0 ? result.errors.join("; ") : t("toastNoRowsImported"),
        });
        return;
      }
      onSuccess?.({ imported: result.imported, errors: [] });

      if (aiEnrichNewCompanies && result.companyIds.length > 0) {
        const loadingId = toast.loading(
          tCompanies("aiEnrich.bulkProgressImport", { total: result.companyIds.length }),
        );
        const bulk = await bulkResearchCompanyEnrichment({
          companyIds: result.companyIds,
        });
        toast.dismiss(loadingId);
        if (!bulk.ok) {
          if (bulk.error === "NOT_AUTHENTICATED") {
            toast.error(tCompanies("aiEnrich.errorNotAuthenticated"));
          } else if (bulk.error === "AI_ENRICHMENT_DISABLED") {
            toast.error(tCompanies("aiEnrich.errorDisabled"));
          } else if (bulk.error === "AI_ENRICHMENT_RATE_LIMIT") {
            toast.error(tCompanies("aiEnrich.errorRateLimit"));
          } else if (bulk.error === "AI_GATEWAY_MISSING") {
            toast.error(tCompanies("aiEnrich.errorNoGateway"));
          } else if (bulk.error === "INVALID_INPUT") {
            toast.error(tCompanies("aiEnrich.errorGeneric"));
          } else {
            toast.error(tCompanies("aiEnrich.errorGeneric"));
          }
        } else {
          const ok = bulk.results.filter((r) => r.ok).length;
          const fail = bulk.results.length - ok;
          toast.success(tCompanies("aiEnrich.bulkDoneImport", { ok, total: bulk.results.length, fail }));
        }
      }

      setPreviewOpen(false);
      setParsedRows([]);
      setFile(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSmallOpenChange = (next: boolean) => {
    if (!next && guideOpenRef.current) {
      return;
    }
    if (!next) {
      setFile(null);
      setParsedRows([]);
      setParseError(null);
      setPreviewOpen(false);
      setGuideOpen(false);
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open && !guideOpen} onOpenChange={handleSmallOpenChange}>
        <WideDialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription className="pt-2">{t("dialogDescription")}</DialogDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-2 sm:w-auto"
              onClick={() => {
                guideOpenRef.current = true;
                setGuideOpen(true);
              }}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
              {t("fieldGuideButton")}
            </Button>
          </DialogHeader>

          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
              {isDragActive ? (
                <p className="font-medium text-lg">{t("dropActive")}</p>
              ) : (
                <p className="font-medium text-lg">{t("dropHint")}</p>
              )}
              <p className="mt-2 text-muted-foreground text-sm">{t("csvOnly")}</p>
            </div>

            {file ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
                <FileText className="h-5 w-5 shrink-0" aria-hidden />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : null}

            {parseError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden />
                <AlertTitle>{t("parseErrorTitle")}</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            ) : null}

            {file ? (
              <Button type="button" onClick={handleParse} disabled={isParsing} className="w-full">
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t("parseButtonParsing")}
                  </>
                ) : (
                  t("parseButton")
                )}
              </Button>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleSmallOpenChange(false)}>
              {t("cancel")}
            </Button>
          </DialogFooter>
        </WideDialogContent>
      </Dialog>

      <CSVPreviewView
        open={previewOpen}
        rows={parsedRows}
        fileName={file?.name ?? ""}
        isImporting={isImporting}
        aiEnrichNewCompanies={aiEnrichNewCompanies}
        onAiEnrichNewCompaniesChange={setAiEnrichNewCompanies}
        onImportNow={handleImport}
        onBackToEdit={handleBackToEdit}
        onCancel={handlePreviewCancel}
      />

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent
          showCloseButton={true}
          overlayClassName={csvImportFullscreenOverlayClassName}
          className={csvImportFullscreenDialogContentClassName}
        >
          <div className="flex h-full min-h-0 flex-col bg-background">
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
                <DialogTitle className="text-lg">{t("guideDialogTitle")}</DialogTitle>
              </div>
              <DialogDescription>{t("guideDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-10 sm:py-8">
              <CSVFieldGuide spacious />
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setGuideOpen(false)}>
                {t("guideClose")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
