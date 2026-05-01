-- AquaDock CRM v5 — Distinct companies list filter buckets.
-- Applied via Supabase migration "companies_filter_buckets" (2026-05-01).
--
-- Returns one JSON object with sorted distinct arrays per facet (status,
-- kundentyp, firmentyp, land, wassertyp) for active companies only. Replaces
-- the client-side pattern of SELECT status, kundentyp, ... FROM companies
-- without LIMIT (full table scan into the browser).

CREATE OR REPLACE FUNCTION public.companies_filter_buckets()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'status', COALESCE(
      (SELECT jsonb_agg(DISTINCT c.status ORDER BY c.status)
       FROM public.companies c
       WHERE c.deleted_at IS NULL AND c.status IS NOT NULL),
      '[]'::jsonb
    ),
    'kundentyp', COALESCE(
      (SELECT jsonb_agg(DISTINCT c.kundentyp ORDER BY c.kundentyp)
       FROM public.companies c
       WHERE c.deleted_at IS NULL AND c.kundentyp IS NOT NULL),
      '[]'::jsonb
    ),
    'firmentyp', COALESCE(
      (SELECT jsonb_agg(DISTINCT c.firmentyp ORDER BY c.firmentyp)
       FROM public.companies c
       WHERE c.deleted_at IS NULL AND c.firmentyp IS NOT NULL),
      '[]'::jsonb
    ),
    'land', COALESCE(
      (SELECT jsonb_agg(DISTINCT c.land ORDER BY c.land)
       FROM public.companies c
       WHERE c.deleted_at IS NULL AND c.land IS NOT NULL),
      '[]'::jsonb
    ),
    'wassertyp', COALESCE(
      (SELECT jsonb_agg(DISTINCT c.wassertyp ORDER BY c.wassertyp)
       FROM public.companies c
       WHERE c.deleted_at IS NULL AND c.wassertyp IS NOT NULL),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.companies_filter_buckets() IS
  'Distinct filter-bucket values for the companies list UI (status, kundentyp, firmentyp, land, wassertyp). SECURITY INVOKER (default) — RLS applies. Replaces full-table SELECT of all rows for filter chips.';

REVOKE ALL ON FUNCTION public.companies_filter_buckets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.companies_filter_buckets() TO authenticated;
