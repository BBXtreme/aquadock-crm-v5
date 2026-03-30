import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return data.user;
});
