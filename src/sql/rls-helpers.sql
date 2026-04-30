-- AquaDock CRM v5 — RLS helper functions
-- Apply FIRST before collaborative RLS migrations (see core-crm-rls-collaborative.sql).
--
-- Security: SECURITY DEFINER reads profiles.role under fixed search_path; EXECUTE only for
-- authenticated. Do not use auth.role() = 'admin' in policies — JWT role is 'authenticated'.

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_app_admin() IS
  'True when JWT subject has profiles.role = admin; used in RLS policies.';

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
