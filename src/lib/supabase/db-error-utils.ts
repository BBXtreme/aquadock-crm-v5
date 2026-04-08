// src/lib/supabase/db-error-utils.ts
// This file contains a utility function for handling errors from Supabase operations
// The `handleSupabaseError` function takes an error object and a context string to provide
// detailed logging of the error in the console, including message, code, details, and hint if available
// It also shows a user-friendly toast notification with the error message when running in a browser environment
// The function returns a new Error object with a standardized message format for consistent error handling across the app

import { toast } from "sonner";

/**
 * Supabase PostgREST errors are usually plain objects `{ message, code, details, hint }`, not `Error` instances.
 * Some paths nest another object under `error`, or only expose `code` / `hint`.
 */
function collectErrorParts(o: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const key of ["message", "details", "hint", "code"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim() !== "") {
      parts.push(key === "code" ? `Code ${v}` : v);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatDatabaseUserMessage(error: unknown): string {
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const o = error as Record<string, unknown>;
    const nested = o.error;
    if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      const fromNested = collectErrorParts(nested as Record<string, unknown>);
      if (fromNested !== null) {
        return fromNested;
      }
    }
    const combined = collectErrorParts(o);
    if (combined !== null) {
      return combined;
    }
  }
  return "An unknown database error occurred";
}

export function handleSupabaseError(error: unknown, context: string): Error {
  console.group(`🚨 Supabase Error in ${context}`);
  console.error("Full error:", error);

  // Improved logging for empty or malformed errors
  if (error === null || error === undefined) {
    console.error("Error is null or undefined");
  } else if (typeof error === "object" && Object.keys(error).length === 0) {
    console.error("Error is an empty object {} – this may indicate a malformed query or silent failure");
  }

  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.message) console.error("Message:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.details) console.error("Details:", err.details);
    if (err.hint) console.error("Hint:", err.hint);
  }
  console.groupEnd();

  const errorMessage = formatDatabaseUserMessage(error);

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
