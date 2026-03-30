import type { User } from '@supabase/supabase-js';

export type UserWithProfile = {
  user: User;
  profile?: {
    role: 'user' | 'admin';
    display_name?: string;
  };
};
