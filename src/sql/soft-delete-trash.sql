-- Soft-delete columns + indexes (idempotent). Run in Supabase SQL Editor.
-- RLS unchanged; enforcement is app-level (.is('deleted_at', null)).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.timeline
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_companies_user_id_deleted_at
  ON public.companies (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_deleted_at
  ON public.contacts (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id_deleted_at
  ON public.reminders (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_timeline_user_id_deleted_at
  ON public.timeline (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_companies_trashed
  ON public.companies (user_id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_trashed
  ON public.contacts (user_id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_trashed
  ON public.reminders (user_id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_trashed
  ON public.timeline (user_id)
  WHERE deleted_at IS NOT NULL;

-- After this file, run `deleted-by-audit.sql` for `deleted_by` + `(user_id, deleted_at, deleted_by)` indexes (it drops the four `idx_*_user_id_deleted_at` indexes above).
