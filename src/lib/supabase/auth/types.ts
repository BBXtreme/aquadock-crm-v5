import type { User } from "@/lib/supabase/database.types";

export type UserWithProfile = {
  user: User;
  profile?: {
    role: "user" | "admin";
    display_name?: string;
  };
};
