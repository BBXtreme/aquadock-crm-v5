-- AquaDock CRM v5 — Core CRM: collaborative read + owner/admin write RLS
-- Prerequisites: public.profiles exists; run rls-helpers.sql first (is_app_admin).
--
-- Phase 1:
--   SELECT: authenticated users see active rows (deleted_at IS NULL); row owner + admins see trashed too.
--   INSERT/UPDATE/DELETE: owner (user_id) or is_app_admin().
--
-- Staging: run entire file as one transaction. Verify smoke tests before production.

BEGIN;

DROP POLICY IF EXISTS "dev_allow_all_inserts" ON public.companies;

DROP POLICY IF EXISTS "users_read_own_companies" ON public.companies;
DROP POLICY IF EXISTS "users_insert_own_companies" ON public.companies;
DROP POLICY IF EXISTS "users_update_own_companies" ON public.companies;
DROP POLICY IF EXISTS "users_delete_own_companies" ON public.companies;
DROP POLICY IF EXISTS companies_select_authenticated ON public.companies;
DROP POLICY IF EXISTS companies_insert_owner ON public.companies;
DROP POLICY IF EXISTS companies_update_owner_or_admin ON public.companies;
DROP POLICY IF EXISTS companies_delete_owner_or_admin ON public.companies;

CREATE POLICY companies_select_authenticated ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = auth.uid()
    OR public.is_app_admin()
  );

CREATE POLICY companies_insert_owner ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY companies_update_owner_or_admin ON public.companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

CREATE POLICY companies_delete_owner_or_admin ON public.companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_insert_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_update_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_delete_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS contacts_select_authenticated ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_owner ON public.contacts;
DROP POLICY IF EXISTS contacts_update_owner_or_admin ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_owner_or_admin ON public.contacts;

CREATE POLICY contacts_select_authenticated ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = auth.uid()
    OR public.is_app_admin()
  );

CREATE POLICY contacts_insert_owner ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY contacts_update_owner_or_admin ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

CREATE POLICY contacts_delete_owner_or_admin ON public.contacts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can access their own reminders" ON public.reminders;
DROP POLICY IF EXISTS reminders_select_authenticated ON public.reminders;
DROP POLICY IF EXISTS reminders_insert_owner ON public.reminders;
DROP POLICY IF EXISTS reminders_update_owner_assignee_or_admin ON public.reminders;
DROP POLICY IF EXISTS reminders_delete_owner_or_admin ON public.reminders;

CREATE POLICY reminders_select_authenticated ON public.reminders
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = auth.uid()
    OR (assigned_to IS NOT NULL AND assigned_to = (auth.uid())::text)
    OR public.is_app_admin()
  );

CREATE POLICY reminders_insert_owner ON public.reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reminders_update_owner_assignee_or_admin ON public.reminders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (assigned_to IS NOT NULL AND assigned_to = (auth.uid())::text)
    OR public.is_app_admin()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (assigned_to IS NOT NULL AND assigned_to = (auth.uid())::text)
    OR public.is_app_admin()
  );

CREATE POLICY reminders_delete_owner_or_admin ON public.reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own timeline" ON public.timeline;
DROP POLICY IF EXISTS "Users can insert timeline" ON public.timeline;
DROP POLICY IF EXISTS "Users can update their own timeline" ON public.timeline;
DROP POLICY IF EXISTS "Users can delete their own timeline" ON public.timeline;
DROP POLICY IF EXISTS "Users can access their own timeline" ON public.timeline;
DROP POLICY IF EXISTS timeline_select_authenticated ON public.timeline;
DROP POLICY IF EXISTS timeline_insert_owner ON public.timeline;
DROP POLICY IF EXISTS timeline_update_owner_or_admin ON public.timeline;
DROP POLICY IF EXISTS timeline_delete_owner_or_admin ON public.timeline;

CREATE POLICY timeline_select_authenticated ON public.timeline
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = auth.uid()
    OR public.is_app_admin()
  );

CREATE POLICY timeline_insert_owner ON public.timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY timeline_update_owner_or_admin ON public.timeline
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

CREATE POLICY timeline_delete_owner_or_admin ON public.timeline
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

ALTER TABLE public.timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_log_select_authenticated ON public.email_log;
DROP POLICY IF EXISTS email_log_insert_authenticated ON public.email_log;
DROP POLICY IF EXISTS email_log_update_owner_or_admin ON public.email_log;
DROP POLICY IF EXISTS email_log_delete_owner_or_admin ON public.email_log;

CREATE POLICY email_log_select_authenticated ON public.email_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY email_log_insert_authenticated ON public.email_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

CREATE POLICY email_log_update_owner_or_admin ON public.email_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

CREATE POLICY email_log_delete_owner_or_admin ON public.email_log
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_authenticated_all ON public.email_templates;

CREATE POLICY email_templates_authenticated_all ON public.email_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

COMMIT;
