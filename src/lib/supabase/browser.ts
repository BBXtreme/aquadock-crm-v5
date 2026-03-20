import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);
  if (error instanceof Error) {
    return new Error(`Database error: ${error.message}`);
  }
  return new Error("An unknown database error occurred");
}
