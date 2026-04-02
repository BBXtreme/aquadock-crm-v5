import { createServerSupabaseClient } from "@/lib/supabase/server";
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

  // Fetch profile for role and display_name
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || null,
    user_metadata: user.user_metadata,
    role: profile?.role || "user",
    display_name: profile?.display_name || null,
    avatar_url: profile?.avatar_url || null,
  };
}
