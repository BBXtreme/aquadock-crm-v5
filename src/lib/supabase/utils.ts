// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function formatCurrency(value: number | null | undefined): string {
  return `€${Number(value ?? 0).toLocaleString("de-DE")}`;
}

export function formatDateDistance(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function safeString(str: string | null | undefined): string {
  return str?.trim() ? str : "—";
}

export function safeDisplay(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
