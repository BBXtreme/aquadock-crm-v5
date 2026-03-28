// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
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
