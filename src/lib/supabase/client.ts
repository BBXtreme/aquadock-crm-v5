import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Browser client for client-side operations
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}

// Central error handler
export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);
  if (error instanceof Error) {
    return new Error(`Database error: ${error.message}`);
  }
  return new Error("An unknown database error occurred");
}
