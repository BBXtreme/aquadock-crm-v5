BEGIN;

DROP POLICY IF EXISTS reminders_select_authenticated ON public.reminders;
DROP POLICY IF EXISTS reminders_insert_owner ON public.reminders;
DROP POLICY IF EXISTS reminders_update_owner_assignee_or_admin ON public.reminders;
DROP POLICY IF EXISTS reminders_delete_owner_or_admin ON public.reminders;

CREATE POLICY reminders_select_authenticated ON public.reminders
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (assigned_to IS NOT NULL AND assigned_to = ((SELECT auth.uid())::text))
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY reminders_insert_owner ON public.reminders
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY reminders_update_owner_assignee_or_admin ON public.reminders
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (assigned_to IS NOT NULL AND assigned_to = ((SELECT auth.uid())::text))
    OR (SELECT public.is_app_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (assigned_to IS NOT NULL AND assigned_to = ((SELECT auth.uid())::text))
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY reminders_delete_owner_or_admin ON public.reminders
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS timeline_select_authenticated ON public.timeline;
DROP POLICY IF EXISTS timeline_insert_owner ON public.timeline;
DROP POLICY IF EXISTS timeline_update_owner_or_admin ON public.timeline;
DROP POLICY IF EXISTS timeline_delete_owner_or_admin ON public.timeline;

CREATE POLICY timeline_select_authenticated ON public.timeline
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY timeline_insert_owner ON public.timeline
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY timeline_update_owner_or_admin ON public.timeline
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY timeline_delete_owner_or_admin ON public.timeline
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS email_log_insert_authenticated ON public.email_log;
DROP POLICY IF EXISTS email_log_update_owner_or_admin ON public.email_log;
DROP POLICY IF EXISTS email_log_delete_owner_or_admin ON public.email_log;

CREATE POLICY email_log_insert_authenticated ON public.email_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR user_id IS NULL
  );

CREATE POLICY email_log_update_owner_or_admin ON public.email_log
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY email_log_delete_owner_or_admin ON public.email_log
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

COMMIT;;
