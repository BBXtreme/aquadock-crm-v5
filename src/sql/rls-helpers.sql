-- AquaDock CRM v5 — RLS helper functions
-- Apply FIRST before collaborative RLS migrations (see core-crm-rls-collaborative.sql).
--
-- The helpers are declared `LANGUAGE plpgsql` so their bodies are validated at
-- call time rather than creation time. This decouples the apply order from
-- `user-roles-table.sql` (the body references `public.user_roles`).
--
-- Security: SECURITY DEFINER reads `public.user_roles` under a fixed
-- search_path; EXECUTE only for `authenticated`. Do not use auth.role() =
-- 'admin' in policies — JWT role is 'authenticated'.

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
  'True when auth.uid() has admin role (delegates to public.user_has_role).';

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
