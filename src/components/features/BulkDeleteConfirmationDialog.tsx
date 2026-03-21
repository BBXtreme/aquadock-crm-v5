import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  loading?: boolean;
}

export function BulkDeleteConfirmationDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  loading,
}: BulkDeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Firmen löschen?</DialogTitle>
          <DialogDescription>
            Sind Sie sicher, dass Sie {selectedCount} Firma{selectedCount !== 1 ? "en" : ""} löschen möchten? Kontakte und Erinnerungen werden ebenfalls gelöscht.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Löschen..." : "Löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
