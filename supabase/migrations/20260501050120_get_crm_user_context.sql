CREATE OR REPLACE FUNCTION public.get_crm_user_context()
RETURNS TABLE (
  profile_role text,
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
    p.role::text,
    p.display_name,
    p.avatar_url,
    (p.id IS NOT NULL),
    pu.status
  FROM (SELECT auth.uid() AS uid) AS me
  LEFT JOIN public.profiles AS p ON p.id = me.uid
  LEFT JOIN public.pending_users AS pu ON pu.auth_user_id = me.uid;
$$;

COMMENT ON FUNCTION public.get_crm_user_context() IS
  'Single round-trip CRM user context loader: returns profile (role/display_name/avatar_url) and pending-onboarding status for auth.uid(). Replaces sequential profiles + pending_users selects in require-crm-access / get-current-user.';

REVOKE ALL ON FUNCTION public.get_crm_user_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_user_context() TO authenticated;;
