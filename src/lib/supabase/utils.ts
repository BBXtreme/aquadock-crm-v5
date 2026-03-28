// Utility functions for Supabase-related operations - src/lib/supabase/utils.ts
import { toast } from "sonner";

export function handleSupabaseError(error: unknown, context: string): Error {
  if (process.env.NODE_ENV === "development") {
    console.group(`Supabase error in ${context}`);
    console.error({
      message: error instanceof Error ? error.message : String(error),
      fullError: error,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
    console.groupEnd();
  } else {
    console.error(`Supabase error in ${context}:`, {
      message: error instanceof Error ? error.message : String(error),
      fullError: error,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
  }

  const errorMessage = error instanceof Error ? error.message : "An unknown database error occurred";

  if (typeof window !== "undefined") {
    toast.error(`Error in ${context}`, { description: errorMessage });
  }

  return new Error(`Database error: ${errorMessage}`);
}
