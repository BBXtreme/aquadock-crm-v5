-- public.user_roles — canonical multi-role mapping for AquaDock CRM users.
-- Apply AFTER profiles-table.sql and rls-helpers.sql.
-- Idempotent: safe to re-run.

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

-- One-time backfill from legacy profiles.role (idempotent).
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role
FROM public.profiles AS p
WHERE p.role IN ('user', 'admin', 'partner')
ON CONFLICT (user_id, role) DO NOTHING;
