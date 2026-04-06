// src/lib/utils/data-format.ts
/**
 * Utility functions for safe data formatting in AquaDock CRM.
 * All functions handle null/undefined inputs safely.
 */

import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

/**
 * Formats a number as currency in German locale (Euro).
 * Handles null/undefined by defaulting to 0.
 * @param v - The numeric value to format
 * @returns Formatted currency string (e.g., "€1.234,56")
 */
export function formatCurrency(v: number | null | undefined): string {
  return `€${(v ?? 0).toLocaleString("de-DE")}`;
}

/**
 * Formats a date string as a relative distance from now.
 * Handles null/undefined by returning '—'.
 * @param d - The date string to format
 * @returns Relative time string (e.g., "2 days ago") or '—' if invalid
 */
export function formatDateDistance(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: de });
  } catch {
    return "—";
  }
}

/**
 * Safely converts a value to string, handling null/undefined by returning fallback.
 * This is the recommended helper for TanStack Table cells.
 * @param v - The value to convert
 * @param fallback - The fallback string if v is null/undefined
 * @returns The string representation or fallback
 */
export function safeDisplay<T>(v: T | null | undefined, fallback = "—"): string {
  return v != null ? String(v) : fallback;
}
