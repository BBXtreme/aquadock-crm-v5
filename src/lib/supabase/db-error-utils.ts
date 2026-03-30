// src/lib/supabase/db-error-utils.ts
// This file contains a utility function for handling errors from Supabase operations
// The `handleSupabaseError` function takes an error object and a context string to provide
// detailed logging of the error in the console, including message, code, details, and hint if available
// It also shows a user-friendly toast notification with the error message when running in a browser environment
// The function returns a new Error object with a standardized message format for consistent error handling across the app

import { toast } from "sonner";

export function handleSupabaseError(error: unknown, context: string): Error {
  console.group(`🚨 Supabase Error in ${context}`);
  console.error("Full error:", error);
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.message) console.error("Message:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.details) console.error("Details:", err.details);
    if (err.hint) console.error("Hint:", err.hint);
  }
  console.groupEnd();

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
