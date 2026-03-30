// src/lib/supabase/query-debug-utils.ts.
// This file contains a debug utility function for logging Supabase query results
// The `debugQuery` function takes a label and data, and logs them to the console
// only in development mode to avoid cluttering the console in production
// This can be used throughout the app to log query results or other relevant
// information when working with Supabase, providing a consistent way to debug
// database interactions without affecting the production environment

/**
 * Debug utility for Supabase queries - logs only in development
 */
export function debugQuery(label: string, data: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.group(`🔍 Supabase Debug: ${label}`);
    console.log("Data:", data);
    console.groupEnd();
  }
}
