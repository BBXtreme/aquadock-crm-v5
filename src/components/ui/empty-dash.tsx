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
      // `font-normal` prevents inheriting bold/medium weight from parent links
      // (e.g. Hauptkontakt name cells). Color comes from --empty-placeholder,
      // defined in globals.css for both light and dark themes. Inline style is
      // used deliberately so it wins against any parent `text-*` utility.
      className={cn("select-none font-normal", className)}
      style={{ color: "var(--empty-placeholder)", ...style }}
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
