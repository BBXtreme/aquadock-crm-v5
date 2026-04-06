// src/lib/auth/require-user.ts

import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "./get-current-user";

/**
 * Request-scoped auth gate (cached): layout + page may both import this;
 * only one redirect/user resolution path runs per RSC request.
 */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});
