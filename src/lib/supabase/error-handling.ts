// src/lib/supabase/error-handling.ts
/**
 * Centralized error handling for Supabase operations.
 * Throws a standardized error for client consumption.
 */

export function handleSupabaseError(error: unknown): never {
  console.error("Supabase error:", error);
  throw new Error(error instanceof Error ? error.message : "An unexpected error occurred");
}
