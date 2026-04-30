-- Optional: run AFTER RLS rollout smoke tests + Playwright on staging.
-- Revokes RPC EXECUTE on SECURITY DEFINER helpers that must not be client-callable.
-- Adjust function signatures if your project differs (inspect pg_proc / Supabase linter).

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_created_updated_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_tournament_for_user(text, date) FROM anon, authenticated;

ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_created_updated_by() SET search_path = pg_catalog, public;
