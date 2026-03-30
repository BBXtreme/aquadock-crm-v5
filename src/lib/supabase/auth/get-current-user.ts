// src/lib/supabase/auth/get-current-user.ts
// This function retrieves the currently authenticated user from Supabase, along with their profile information (role, display name, and avatar URL). It returns an AuthUser object or null if there is no 
// authenticated user or if an error occurs.  
// The function uses the createServerSupabaseClient to create a Supabase client instance, then calls supabase.auth.getUser() to get the current user. If a user is found, it queries the "profiles" table to get additional profile information and constructs an AuthUser object to return.

import { createServerSupabaseClient } from "../server-client";
import type { AuthUser } from "./types";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Fetch profile (role + display_name) – use maybeSingle to avoid errors if profile doesn't exist
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: user.user_metadata,
    role: (profile?.role as "user" | "admin") || "user",
    display_name: profile?.display_name || (user.user_metadata?.display_name as string) || null,
    avatar_url: profile?.avatar_url || null,
  };
}
