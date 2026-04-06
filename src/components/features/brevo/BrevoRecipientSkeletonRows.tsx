import {
  BREVO_RECIPIENT_SKELETON_COL_KEYS,
  BREVO_RECIPIENT_SKELETON_ROW_KEYS,
} from "@/components/features/brevo/brevo-recipient-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

export function BrevoRecipientSkeletonRows() {
  return (
    <TableBody>
      {BREVO_RECIPIENT_SKELETON_ROW_KEYS.map((rowKey) => (
        <TableRow key={rowKey}>
          {BREVO_RECIPIENT_SKELETON_COL_KEYS.map((colKey) => (
            <TableCell key={`${rowKey}-${colKey}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
