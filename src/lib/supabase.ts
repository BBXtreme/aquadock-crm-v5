// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Das ist der Client, den page.tsx erwartet
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Optional: Server-Only Client (für Route Handlers / Server Actions später)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
