-- AquaDock CRM v5 — Single round-trip CRM user context loader.
-- Applied via Supabase migration "get_crm_user_context" (2026-05-01),
-- extended for canonical roles[] in migration "partner_user_roles" (2026-05-17).
--
-- Returns the legacy `profile_role` PLUS the canonical multi-role payload
-- (`roles text[]` from `public.user_roles`) together with display fields and
-- pending-onboarding status for the current `auth.uid()` in ONE call, replacing
-- sequential SELECTs previously executed by require-crm-access.ts +
-- get-current-user.ts.
--
-- Security: SECURITY DEFINER with pinned search_path; EXECUTE granted to
-- authenticated only (anon and PUBLIC explicitly revoked).

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
  'Single round-trip CRM context: legacy profile_role plus canonical roles[] from public.user_roles, display_name, avatar_url, and pending_status.';

REVOKE ALL ON FUNCTION public.get_crm_user_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_user_context() TO authenticated;
