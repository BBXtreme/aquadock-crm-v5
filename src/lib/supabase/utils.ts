export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);
  if (error instanceof Error) {
    return new Error(`Database error: ${error.message}`);
  }
  return new Error("An unknown database error occurred");
}
