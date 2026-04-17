// src/components/ui/empty-dash.tsx
// Decorative placeholder for empty table cells and "no data" fields. Uses an
// em-dash at very low opacity so the eye skips past it — present enough for
// alignment, absent enough that actual data dominates the visual scan.
// `select-none` keeps it out of copy/paste output (it's not real content).

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function EmptyDash({ className, style, ...rest }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-empty-dash=""
      // Color + weight are hardcoded via inline style so they win over any
      // ancestor `text-*` / `font-medium` utility (e.g. name cells with link
      // styling). No Tailwind JIT, no CSS variables — guaranteed to apply.
      className={cn("select-none", className)}
      style={{ color: "#e4e4e7", fontWeight: 400, ...style }}
      {...rest}
    >
      —
    </span>
  );
}

/**
 * Renders the value as a string if present, or `<EmptyDash />` if empty.
 * Convenience wrapper for common TanStack Table cells that previously used
 * `safeDisplay(info.getValue())`.
 */
export function DisplayOrDash({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <EmptyDash />;
  const str = typeof value === "string" ? value : String(value);
  if (str.trim() === "") return <EmptyDash />;
  return <>{str}</>;
}
