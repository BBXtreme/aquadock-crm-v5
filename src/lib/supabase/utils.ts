// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
import { toast } from "sonner";

export function handleSupabaseError(error: unknown, context: string): Error {
  console.group(`🚨 Supabase Error in ${context}`);
  console.error("Full error:", error);
  console.error("Message:", (error as any)?.message);
  console.error("Code:", (error as any)?.code);
  console.error("Details:", (error as any)?.details);
  console.error("Hint:", (error as any)?.hint);
  console.groupEnd();

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
