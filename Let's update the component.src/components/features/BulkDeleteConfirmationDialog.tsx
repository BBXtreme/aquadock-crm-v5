import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount?: number;
  title?: string;
  description?: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  count?: number;
}

export function BulkDeleteConfirmationDialog({
  open,
  onOpenChange,
  selectedCount,
  title = "Firmen löschen?",
  description,
  onConfirm,
  confirmText = "Löschen",
  cancelText = "Abbrechen",
  loading,
  count,
}: BulkDeleteConfirmationDialogProps) {
  const displayCount = selectedCount ?? count ?? 0;
  const defaultDescription = `Sind Sie sicher, dass Sie ${displayCount} Firma${displayCount !== 1 ? "en" : ""} löschen möchten? Kontakte und Erinnerungen werden ebenfalls gelöscht.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? defaultDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? `${confirmText}...` : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
