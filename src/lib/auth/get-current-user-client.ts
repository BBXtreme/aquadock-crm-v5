// src/lib/auth/get-current-user-client.ts
//
// Client-side AuthUser builder backed by Supabase Auth `user_metadata`. The
// canonical multi-role list lives in `public.user_roles` (server-only). On the
// client we only expose the legacy single-role fallback from user_metadata and
// surface it as `roles = [role]` so type-shape stays consistent.

import { createClient } from "@/lib/supabase/browser";
import { type AuthUser, isUserRole } from "./types";

export async function getCurrentUserClient(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const metadataRoleRaw = user.user_metadata?.role;
  const metadataRole = isUserRole(metadataRoleRaw) ? metadataRoleRaw : "user";

  return {
    id: user.id,
    email: user.email || null,
    user_metadata: user.user_metadata,
    role: metadataRole,
    roles: [metadataRole],
    display_name: user.user_metadata?.display_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  };
}
