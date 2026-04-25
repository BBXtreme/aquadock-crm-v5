// src/components/ui/status-badge.tsx
// Shared status badge primitive. Single source of truth for color + label logic
// across the Companies table, Company detail hero, and any other status
// surface. Colors come from `statusColors` (map palette). Labels default to the
// plain text variant; pass `showEmoji` to render the richer emoji-prefixed
// label where there's room for it (e.g. hero badges, detail cards).

"use client";

import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { statusLabels as emojiStatusLabels } from "@/lib/constants/company-labels";
import { statusLabels as plainStatusLabels, statusColors } from "@/lib/constants/map-status-colors";
import { cn } from "@/lib/utils";

type BadgeProps = ComponentProps<typeof Badge>;

export interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "style" | "children"> {
  status: string | null | undefined;
  showEmoji?: boolean;
}

const FALLBACK_COLOR = "#6b7280";

export function StatusBadge({ status, showEmoji = false, className, ...rest }: StatusBadgeProps) {
  const raw = status ?? "";
  const key = raw.normalize("NFC").trim().toLowerCase();
  const backgroundColor = statusColors[key] ?? FALLBACK_COLOR;
  const label = showEmoji
    ? (emojiStatusLabels[key] ?? plainStatusLabels[key] ?? raw.trim())
    : (plainStatusLabels[key] ?? raw.trim());

  return (
    <Badge
      variant="secondary"
      className={cn(
        "whitespace-nowrap border-transparent bg-transparent text-white shadow-sm ring-1 ring-border/60 hover:opacity-95 dark:ring-border",
        className,
      )}
      style={{ backgroundColor }}
      {...rest}
    >
      {label}
    </Badge>
  );
}
