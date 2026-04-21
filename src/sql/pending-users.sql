-- pending_users: access-request pipeline (apply → confirm → admin review → accept/decline).
-- Apply after review: run `pnpm supabase:types` to refresh src/types/supabase.ts.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.pending_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name text,
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'pending_email_confirmation',
    'pending_review',
    'accepted',
    'declined'
  )),
  requested_at timestamptz NOT NULL DEFAULT now(),
  email_confirmed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id),
  chosen_role text CHECK (chosen_role IS NULL OR chosen_role IN ('user', 'admin')),
  decline_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_users_status ON public.pending_users (status);
CREATE INDEX IF NOT EXISTS idx_pending_users_auth_user_id ON public.pending_users (auth_user_id);

ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_users_select_own_or_admin" ON public.pending_users;
CREATE POLICY "pending_users_select_own_or_admin"
ON public.pending_users FOR SELECT
USING (
  auth.uid() = auth_user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "pending_users_insert_admin" ON public.pending_users;
CREATE POLICY "pending_users_insert_admin"
ON public.pending_users FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "pending_users_update_admin" ON public.pending_users;
CREATE POLICY "pending_users_update_admin"
ON public.pending_users FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "pending_users_delete_admin" ON public.pending_users;
CREATE POLICY "pending_users_delete_admin"
ON public.pending_users FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE OR REPLACE FUNCTION public.set_pending_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pending_users_updated_at ON public.pending_users;
CREATE TRIGGER trg_pending_users_updated_at
BEFORE UPDATE ON public.pending_users
FOR EACH ROW
EXECUTE PROCEDURE public.set_pending_users_updated_at();
