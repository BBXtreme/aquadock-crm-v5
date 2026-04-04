// src/lib/auth/get-current-user-client.ts
import { createClient } from "@/lib/supabase/browser";
import type { AuthUser, UserRole } from "./types";

export async function getCurrentUserClient(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || null,
    user_metadata: user.user_metadata,
    role: (user.user_metadata?.role as UserRole) || "user",
    display_name: user.user_metadata?.display_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  };
}
