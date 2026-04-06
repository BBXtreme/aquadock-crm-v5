// src/components/features/brevo/use-brevo-recipient-row-selection.ts
"use client";

import {
  functionalUpdate,
  type OnChangeFn,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useCallback, useRef, useState } from "react";

/**
 * Keeps TanStack `rowSelection` in sync with parent contact UUIDs. Requires
 * `getRowId: (row) => row.id` on the table so selection keys are CRM ids.
 */
export function useBrevoRecipientRowSelection(onIdsChange: (ids: string[]) => void) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const lastPushedIds = useRef<string[] | null>(null);

  const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      setRowSelection((prev) => {
        const next = functionalUpdate(updater, prev);
        const selectedIds = Object.keys(next).filter((id) => next[id]);
        const last = lastPushedIds.current;
        if (
          last !== null &&
          last.length === selectedIds.length &&
          last.every((x, i) => x === selectedIds[i])
        ) {
          return next;
        }
        lastPushedIds.current = selectedIds;
        onIdsChange(selectedIds);
        return next;
      });
    },
    [onIdsChange],
  );

  return { rowSelection, onRowSelectionChange };
}
