-- AquaDock CRM v5 — Dashboard KPI aggregator.
-- Applied via Supabase migration "get_dashboard_kpis" (2026-05-01).
--
-- Replaces three unbounded client-side full-table SELECTs on
-- companies/contacts/timeline (see DashboardClient pre-Phase-2.1) with a single
-- server-side aggregate. SECURITY INVOKER (default) so existing collaborative
-- SELECT RLS policies still apply — counts mirror what the calling user can see.

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(period_days integer DEFAULT 30)
RETURNS TABLE (
  total_companies bigint,
  total_contacts bigint,
  total_activities bigint,
  companies_in_period bigint,
  total_value numeric,
  leads bigint,
  won bigint
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH params AS (
    SELECT GREATEST(period_days, 1) * INTERVAL '1 day' AS period
  )
  SELECT
    (SELECT COUNT(*) FROM public.companies WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.contacts WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.timeline WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.companies, params WHERE deleted_at IS NULL AND created_at >= now() - params.period),
    (SELECT COALESCE(SUM(value), 0) FROM public.companies WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.companies WHERE deleted_at IS NULL AND status = 'lead'),
    (SELECT COUNT(*) FROM public.companies WHERE deleted_at IS NULL AND status = 'gewonnen');
$$;

COMMENT ON FUNCTION public.get_dashboard_kpis(integer) IS
  'Server-side dashboard KPI aggregator. SECURITY INVOKER (default) so RLS still applies. Replaces three unbounded client-side full-table SELECTs on companies/contacts/timeline.';

REVOKE ALL ON FUNCTION public.get_dashboard_kpis(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(integer) TO authenticated;
