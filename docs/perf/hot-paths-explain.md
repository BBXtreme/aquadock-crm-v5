# Hot-path EXPLAIN templates (Postgres)

Use **Supabase SQL Editor** (or `psql`) as an **`authenticated`** session when checking plans so **RLS matches production**. Prefix heavy checks with `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` only on staging or during a quiet window — `ANALYZE` executes the query.

## Dashboard KPIs

Function: `public.get_dashboard_kpis(period_days integer default 30)` — defined in [`src/sql/dashboard-kpis.sql`](../../src/sql/dashboard-kpis.sql).

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.get_dashboard_kpis(30);
```

Expect several **RLS-respecting** index scans or bitmap scans on `companies`, `contacts`, and `timeline` with `deleted_at IS NULL` predicates. Compare **planning time**, **execution time**, and **buffers hit/read** before and after RLS policy tweaks.

## Companies filter buckets

Function: `public.companies_filter_buckets()` — [`src/sql/companies-filter-buckets.sql`](../../src/sql/companies-filter-buckets.sql).

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT public.companies_filter_buckets();
```

Each facet runs a distinct subquery over `companies`; verify seq scans are acceptable at your row counts or consider supporting indexes if advisors flag regressions.

## Company search RPC

If search uses `public.hybrid_company_search` (or equivalent), capture a representative call with the same arguments your UI sends:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.hybrid_company_search(
  /* match parameters used by /api/companies/search */
);
```

Adjust the argument list to match the live function signature from `pg_proc` / generated types.

## CRM user context loader

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.get_crm_user_context();
```

Useful after auth-path consolidation; ensures profile/pending lookups stay index-friendly.
