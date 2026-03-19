// src/lib/supabase.ts
// Modern Supabase client setup for Next.js App Router
// Uses @supabase/supabase-js v2 – correct import without /client

import { createClient } from '@supabase/supabase-js';

// Read environment variables (make sure they are defined in .env.local and Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ────────────────────────────────────────────────
// Browser/Client Component Client (default export)
// Used in Client Components, Server Components, etc.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,        // automatically refresh token
    persistSession: true,          // persist session in localStorage
    detectSessionInUrl: true,      // handle OAuth redirects
  },
});

// ────────────────────────────────────────────────
// Optional: Server-only client (recommended for Route Handlers, Server Actions)
// Does NOT send anon key to client – better security for admin operations
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,     // server does not need auto-refresh
      persistSession: false,       // no localStorage on server
    },
  });
}

// ────────────────────────────────────────────────
// Optional: Export types if needed in many places
export type { Session, User } from '@supabase/supabase-js';