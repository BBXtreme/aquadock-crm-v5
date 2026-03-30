// src/lib/supabase/auth/types.ts
// This file defines the types related to authentication and user profiles in the Supabase 
// context.
// The types defined here include UserRole, Profile, and AuthUser, which are used to represent 
// user roles, user profiles, and authenticated user information respectively.

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

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