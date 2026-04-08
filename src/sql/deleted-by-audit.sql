-- deleted_by audit column + composite indexes (idempotent). Run in Supabase SQL Editor after soft-delete-trash.sql.
-- FK to auth.users; set only on soft-delete via app (server actions).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users (id);
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users (id);
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users (id);
ALTER TABLE public.timeline
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users (id);

-- Replace narrower (user_id, deleted_at) indexes with (user_id, deleted_at, deleted_by)
DROP INDEX IF EXISTS idx_companies_user_id_deleted_at;
DROP INDEX IF EXISTS idx_contacts_user_id_deleted_at;
DROP INDEX IF EXISTS idx_reminders_user_id_deleted_at;
DROP INDEX IF EXISTS idx_timeline_user_id_deleted_at;

CREATE INDEX IF NOT EXISTS idx_companies_user_id_deleted_at_deleted_by
  ON public.companies (user_id, deleted_at, deleted_by);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_deleted_at_deleted_by
  ON public.contacts (user_id, deleted_at, deleted_by);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id_deleted_at_deleted_by
  ON public.reminders (user_id, deleted_at, deleted_by);
CREATE INDEX IF NOT EXISTS idx_timeline_user_id_deleted_at_deleted_by
  ON public.timeline (user_id, deleted_at, deleted_by);
