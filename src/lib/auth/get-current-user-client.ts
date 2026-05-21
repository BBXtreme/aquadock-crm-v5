// src/lib/auth/get-current-user-client.ts
//
// Client-side AuthUser loader. Canonical roles come from the server `/api/auth/me`
// route (backed by `public.user_roles`). Falls back to JWT `user_metadata.role` only
// when the API is unavailable.

import { createClient } from "@/lib/supabase/browser";
import { type AuthUser, isUserRole } from "./types";

type AuthMeResponse = {
  id: string;
  email: string | null;
  role: string;
  roles: string[];
  display_name: string | null;
  avatar_url: string | null;
};

function authUserFromMetadata(
  id: string,
  email: string | null,
  userMetadata: Record<string, unknown> | undefined,
): AuthUser {
  const metadataRoleRaw = userMetadata?.role;
  const metadataRole =
    typeof metadataRoleRaw === "string" && isUserRole(metadataRoleRaw) ? metadataRoleRaw : "user";
  const displayName =
    typeof userMetadata?.display_name === "string" ? userMetadata.display_name : null;
  const avatarUrl =
    typeof userMetadata?.avatar_url === "string" ? userMetadata.avatar_url : null;
  return {
    id,
    email,
    user_metadata: displayName != null ? { display_name: displayName } : {},
    role: metadataRole,
    roles: [metadataRole],
    display_name: displayName,
    avatar_url: avatarUrl,
  };
}

function toUserMetadata(userMetadata: Record<string, unknown> | undefined): AuthUser["user_metadata"] {
  if (userMetadata === undefined) {
    return {};
  }
  const displayName = userMetadata.display_name;
  if (typeof displayName === "string") {
    return { display_name: displayName };
  }
  return {};
}

function authUserFromMePayload(
  payload: AuthMeResponse,
  userMetadata: Record<string, unknown> | undefined,
): AuthUser {
  const roles = payload.roles.filter((candidate): candidate is AuthUser["roles"][number] =>
    isUserRole(candidate),
  );
  const role = isUserRole(payload.role)
    ? payload.role
    : (roles[0] ?? "user");
  const normalizedRoles = roles.length > 0 ? roles : [role];
  return {
    id: payload.id,
    email: payload.email,
    user_metadata: toUserMetadata(userMetadata),
    role,
    roles: normalizedRoles,
    display_name: payload.display_name,
    avatar_url: payload.avatar_url,
  };
}

export async function getCurrentUserClient(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (response.ok) {
      const payload = (await response.json()) as AuthMeResponse;
      return authUserFromMePayload(payload, user.user_metadata);
    }
  } catch {
    // Fall through to metadata-only shape when the API cannot be reached.
  }

  return authUserFromMetadata(user.id, user.email ?? null, user.user_metadata as Record<string, unknown>);
}
