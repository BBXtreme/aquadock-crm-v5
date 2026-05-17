-- public.profiles — app user directory (id = auth.users.id).
-- Required before: comments-tables.sql, comment_attachments FKs, feedback RLS, pending_users FKs, etc.
-- Apply once on new Supabase projects (or any DB missing this table).
--
-- NOTE: `profiles.role` is DEPRECATED as of the partner role rollout. New code
-- must read/write roles via `public.user_roles` (see `user-roles-table.sql`).
-- The column remains for legacy compatibility and is scheduled for removal in
-- v5.1.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'partner')),
  display_name text,
  avatar_url text,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

COMMENT ON TABLE public.profiles IS 'CRM user roles (legacy) and display fields; PK mirrors auth.users.id.';
COMMENT ON COLUMN public.profiles.role IS
  'DEPRECATED: legacy single-role column. Canonical source is public.user_roles. Will be removed in v5.1.';

-- Ensure the constraint is up-to-date on databases that pre-date the partner role.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'partner'));

-- Keep updated_at in sync (matches pattern in comments-tables.sql)
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.user_has_role('admin')
);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));
