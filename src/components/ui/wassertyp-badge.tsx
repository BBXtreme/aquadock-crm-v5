// src/components/ui/wassertyp-badge.tsx
// Shared wassertyp badge primitive. Single source of truth for how water-type
// chips render in CRM surfaces (company detail hero, linked-company cards,
// etc.). Uses an outline badge + Waves icon. The OpenMap popup intentionally
// keeps its own solid-pill style but shares the Waves icon for visual
// consistency.

"use client";

import { Waves } from "lucide-react";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeProps = ComponentProps<typeof Badge>;

export interface WassertypBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  wassertyp: string | null | undefined;
}

export function WassertypBadge({ wassertyp, className, ...rest }: WassertypBadgeProps) {
  if (!wassertyp) return null;
  return (
    <Badge variant="outline" className={cn("gap-1", className)} {...rest}>
      <Waves className="h-3 w-3" aria-hidden />
      {wassertyp}
    </Badge>
  );
}
