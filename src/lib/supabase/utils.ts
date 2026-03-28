// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
import { toast } from "sonner";

export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, JSON.stringify(error, null, 2));

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  // Log additional details if available
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.code) console.error(`Error code: ${err.code}`);
    if (err.details) console.error(`Error details: ${err.details}`);
    if (err.hint) console.error(`Error hint: ${err.hint}`);
  }

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
