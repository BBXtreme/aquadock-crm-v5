// src/lib/auth/get-current-user.ts

import { cache } from "react";

import { getCrmUserContext } from "./get-crm-user-context";
import type { AuthUser } from "./types";

/**
 * Returns the current `AuthUser` (or `null` when unauthenticated).
 *
 * Thin projection over `getCrmUserContext()` — both functions are React-cached,
 * so co-located callers (layout + page + auth helpers) share a single resolution
 * per RSC request: at most 1 Supabase Auth call + 1 Postgres RPC.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const { user } = await getCrmUserContext();
  return user;
});
