-- AquaDock CRM v5 — Single round-trip CRM user context loader.
-- Applied via Supabase migration "get_crm_user_context" (2026-05-01).
--
-- Returns profile (role, display_name, avatar_url) AND pending-onboarding status
-- for the current auth.uid() in ONE call, replacing the sequential
--   SELECT profiles WHERE id = auth.uid()
--   SELECT pending_users WHERE auth_user_id = auth.uid()
-- pattern previously executed by require-crm-access.ts + get-current-user.ts.
--
-- Security: SECURITY DEFINER with pinned search_path; EXECUTE granted to
-- authenticated only (anon and PUBLIC explicitly revoked).

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
GRANT EXECUTE ON FUNCTION public.get_crm_user_context() TO authenticated;
