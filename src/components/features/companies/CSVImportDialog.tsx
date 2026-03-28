"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importCompaniesFromCSV } from "@/lib/supabase/services/companies";
import { type ParsedCompanyRow, parseCSVFile } from "@/lib/utils/csv-import";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CSVImportDialog({ open, onOpenChange, onSuccess }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCompanyRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setParsedRows([]);
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
    if (!file) return;

    setIsParsing(true);
    try {
      const rows = await parseCSVFile(file);
      setParsedRows(rows);
      toast.success(`Parsed ${rows.length} rows successfully`);
    } catch (error) {
      toast.error(`Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importCompaniesFromCSV(parsedRows);
      if (result.errors.length > 0) {
        toast.error(`Import failed: ${result.errors.join(", ")}`);
      } else {
        onSuccess?.();
        onOpenChange(false);
        setFile(null);
        setParsedRows([]);
      }
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFile(null);
    setParsedRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Companies from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with company data. The file should have columns like Firmenname, Kundentyp, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the CSV file here...</p>
            ) : (
              <p className="text-lg font-medium">Drag & drop a CSV file here, or click to select</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">Only CSV files are accepted</p>
          </div>

          {/* File Name Display */}
          {file && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <FileText className="h-5 w-5" />
              <span className="font-medium">{file.name}</span>
              <span className="text-sm text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          {/* Parse Button */}
          {file && parsedRows.length === 0 && (
            <Button onClick={handleParse} disabled={isParsing} className="w-full">
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse CSV"
              )}
            </Button>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview ({parsedRows.length} rows)</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firmenname</TableHead>
                      <TableHead>Kundentyp</TableHead>
                      <TableHead>Wasserdistanz</TableHead>
                      <TableHead>Lat/Lon</TableHead>
                      <TableHead>OSM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 10).map((row, index) => (
                      <TableRow key={`preview-${row.firmenname}-${row.kundentyp}-${index}`}>
                        <TableCell>{row.firmenname}</TableCell>
                        <TableCell>{row.kundentyp}</TableCell>
                        <TableCell>{row.wasser_distanz ?? "-"}</TableCell>
                        <TableCell>
                          {row.lat && row.lon ? `${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}` : "-"}
                        </TableCell>
                        <TableCell>{row.osm ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ... and {parsedRows.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {parsedRows.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${parsedRows.length} Companies`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
