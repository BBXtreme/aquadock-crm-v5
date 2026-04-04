// src/lib/supabase/auth/types.ts
export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: {
    display_name?: string;
  };
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
}
