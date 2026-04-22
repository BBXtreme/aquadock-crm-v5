-- One-time backfill: set owner (user_id) from audit column (created_by) where missing.
-- Preconditions: created_by stores the same uuid as profiles.id / auth.users.id (app convention).
-- Scope: active rows only (deleted_at IS NULL).
--
-- Apply in Supabase SQL Editor (review counts first), or run the equivalent Node script:
--   pnpm backfill:user-id
--
-- Idempotent: safe to re-run; subsequent runs affect 0 rows unless new nulls appear.

BEGIN;

UPDATE public.companies
SET user_id = created_by
WHERE deleted_at IS NULL
  AND user_id IS NULL
  AND created_by IS NOT NULL;

UPDATE public.contacts
SET user_id = created_by
WHERE deleted_at IS NULL
  AND user_id IS NULL
  AND created_by IS NOT NULL;

COMMIT;

-- Verification (optional):
-- SELECT COUNT(*) AS companies_still_orphaned
-- FROM public.companies
-- WHERE deleted_at IS NULL AND user_id IS NULL AND created_by IS NOT NULL;
--
-- SELECT COUNT(*) AS contacts_still_orphaned
-- FROM public.contacts
-- WHERE deleted_at IS NULL AND user_id IS NULL AND created_by IS NOT NULL;
--
-- Rows with both user_id and created_by NULL are unchanged; fix manually or leave unassigned.
