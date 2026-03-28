// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
import { toast } from "sonner";

export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
