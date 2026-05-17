-- Partner role + multi-role support.
--
-- Adds the canonical `public.user_roles(user_id, role)` table, an RLS helper
-- `public.user_has_role(role text)`, and extends `public.get_crm_user_context()`
-- to return a canonical `roles text[]` payload. Backfills `user_roles` from the
-- legacy `profiles.role` column, marks `profiles.role` as deprecated, and
-- rewrites admin-checking RLS policies on `profiles`, `pending_users`, and
-- `feedback` to use the new helper.
--
-- Idempotent: safe to re-run. Wrapped in a single transaction so a failure
-- leaves the database unchanged.

BEGIN;

-- 1) Canonical multi-role table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'admin', 'partner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_user_id
  ON public.user_roles (role, user_id);

COMMENT ON TABLE public.user_roles IS
  'Canonical user role mapping for AquaDock CRM (multi-role).';

COMMENT ON COLUMN public.user_roles.role IS
  'Allowed roles: user, admin, partner.';


-- 2) Updated-at trigger for user_roles -----------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_set_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_set_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_roles_updated_at();


-- 3) Role helper used by RLS ---------------------------------------------------
-- plpgsql is used so the body is validated at call time, not creation time.
-- This keeps the helper resilient to apply ordering across SQL source files.
CREATE OR REPLACE FUNCTION public.user_has_role(target_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF target_role IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = target_role
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_role(text) IS
  'True when auth.uid() has the given role in public.user_roles. Canonical role helper for RLS.';

REVOKE ALL ON FUNCTION public.user_has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(text) TO authenticated;


-- 4) Keep existing helper but delegate to canonical helper --------------------
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN public.user_has_role('admin');
END;
$$;

COMMENT ON FUNCTION public.is_app_admin() IS
  'True when auth.uid() has admin role (delegates to user_has_role).';

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;


-- 5) Legacy compatibility constraints + deprecation marker --------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'partner'));

COMMENT ON COLUMN public.profiles.role IS
  'DEPRECATED: legacy single-role column. Canonical source is public.user_roles. Will be removed in v5.1.';

ALTER TABLE public.pending_users
  DROP CONSTRAINT IF EXISTS pending_users_chosen_role_check;

ALTER TABLE public.pending_users
  ADD CONSTRAINT pending_users_chosen_role_check
  CHECK (
    chosen_role IS NULL
    OR chosen_role IN ('user', 'admin', 'partner')
  );


-- 6) Idempotent backfill into canonical table ---------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role
FROM public.profiles AS p
WHERE p.role IN ('user', 'admin', 'partner')
ON CONFLICT (user_id, role) DO NOTHING;


-- 7) RLS for user_roles -------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.user_has_role('admin')
);

DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
WITH CHECK (public.user_has_role('admin'));

DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
CREATE POLICY "user_roles_update_admin"
ON public.user_roles
FOR UPDATE
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));

DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
USING (public.user_has_role('admin'));


-- 8) Rewrite existing profile policies to helper ------------------------------
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.user_has_role('admin')
);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
ON public.profiles
FOR UPDATE
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));


-- 9) Rewrite pending_users policies to helper ---------------------------------
DROP POLICY IF EXISTS "pending_users_select_own_or_admin" ON public.pending_users;
CREATE POLICY "pending_users_select_own_or_admin"
ON public.pending_users
FOR SELECT
USING (
  auth.uid() = auth_user_id
  OR public.user_has_role('admin')
);

DROP POLICY IF EXISTS "pending_users_insert_admin" ON public.pending_users;
CREATE POLICY "pending_users_insert_admin"
ON public.pending_users
FOR INSERT
WITH CHECK (public.user_has_role('admin'));

DROP POLICY IF EXISTS "pending_users_update_admin" ON public.pending_users;
CREATE POLICY "pending_users_update_admin"
ON public.pending_users
FOR UPDATE
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));

DROP POLICY IF EXISTS "pending_users_delete_admin" ON public.pending_users;
CREATE POLICY "pending_users_delete_admin"
ON public.pending_users
FOR DELETE
USING (public.user_has_role('admin'));


-- 10) Rewrite feedback policy if table exists ---------------------------------
DO $$
BEGIN
  IF to_regclass('public.feedback') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "feedback_select_own_or_admin" ON public.feedback';
    EXECUTE '
      CREATE POLICY "feedback_select_own_or_admin"
      ON public.feedback
      FOR SELECT
      USING (
        auth.uid() = user_id
        OR public.user_has_role(''admin'')
      )
    ';
  END IF;
END
$$;


-- 11) Extend RPC context payload with roles[] ---------------------------------
DROP FUNCTION IF EXISTS public.get_crm_user_context();

CREATE FUNCTION public.get_crm_user_context()
RETURNS TABLE (
  profile_role text,
  roles text[],
  display_name text,
  avatar_url text,
  profile_exists boolean,
  pending_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    p.role::text AS profile_role,
    COALESCE(
      (
        SELECT array_agg(ur.role ORDER BY ur.role)
        FROM public.user_roles AS ur
        WHERE ur.user_id = me.uid
      ),
      CASE
        WHEN p.role IS NOT NULL THEN ARRAY[p.role::text]
        ELSE ARRAY[]::text[]
      END
    ) AS roles,
    p.display_name,
    p.avatar_url,
    (p.id IS NOT NULL) AS profile_exists,
    pu.status AS pending_status
  FROM (SELECT auth.uid() AS uid) AS me
  LEFT JOIN public.profiles AS p ON p.id = me.uid
  LEFT JOIN public.pending_users AS pu ON pu.auth_user_id = me.uid;
$$;

COMMENT ON FUNCTION public.get_crm_user_context() IS
  'Single round-trip CRM context: legacy profile_role plus canonical roles[] from user_roles, display_name, avatar_url, and pending_status.';

REVOKE ALL ON FUNCTION public.get_crm_user_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_user_context() TO authenticated;

COMMIT;
