-- AquaDock CRM v5 — Companies list KPI aggregator (Phase 2.1).
-- Applied via Supabase migration "companies_stats" (2026-05-21).
--
-- Replaces the unbounded client-side full-table SELECT on companies
-- (`use-companies-list-queries.ts` `companies-stats` query) that downloaded
-- every active row to the browser to compute four KPI numbers. SECURITY
-- INVOKER (default) so existing collaborative SELECT RLS policies still apply
-- — counts mirror what the calling user can see.
--
-- Mirrors the pattern in `get_dashboard_kpis()` (see dashboard-kpis.sql).

CREATE OR REPLACE FUNCTION public.companies_stats()
RETURNS TABLE (
  total bigint,
  leads bigint,
  won bigint,
  value_sum numeric
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    count(*)                                              AS total,
    count(*) FILTER (WHERE status = 'lead')               AS leads,
    count(*) FILTER (WHERE status = 'gewonnen')           AS won,
    coalesce(sum(value), 0)                               AS value_sum
  FROM public.companies
  WHERE deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.companies_stats() IS
  'Server-side companies list KPI aggregator. SECURITY INVOKER (default) so RLS still applies. Replaces the unbounded browser-side full-table SELECT in use-companies-list-queries.ts (Phase 2.1).';

REVOKE ALL ON FUNCTION public.companies_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.companies_stats() TO authenticated;
