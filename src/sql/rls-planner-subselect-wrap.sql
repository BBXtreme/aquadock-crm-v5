-- AquaDock CRM v5 — RLS planner caching: wrap auth.uid() and is_app_admin() in scalar subqueries.
-- Applied via Supabase migration(s) (2026-05-01): either this single script in SQL Editor,
-- or four tracked migrations — rls_planner_subselect_wrap_core_crm,
-- rls_planner_subselect_wrap_reminders_timeline_email,
-- rls_planner_subselect_wrap_profiles_settings,
-- rls_planner_subselect_wrap_comments_attachments (same statements, split for tooling limits).
--
-- Postgres re-evaluates bare auth.uid() / VOLATILE calls per row in RLS. Wrapping in
-- `(SELECT …)` lets the planner treat them as stable for the statement (Supabase RLS
-- performance guide). Behavior is unchanged; only policy expressions are rewritten.
--
-- Prerequisites: rls-helpers.sql (is_app_admin), all prior RLS migrations applied.
-- Staging: smoke companies/contacts/timeline/reminders/comments/profiles/settings.

BEGIN;

-- ─── companies ───
DROP POLICY IF EXISTS companies_select_authenticated ON public.companies;
DROP POLICY IF EXISTS companies_insert_owner ON public.companies;
DROP POLICY IF EXISTS companies_update_owner_or_admin ON public.companies;
DROP POLICY IF EXISTS companies_delete_owner_or_admin ON public.companies;

CREATE POLICY companies_select_authenticated ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY companies_insert_owner ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY companies_update_owner_or_admin ON public.companies
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY companies_delete_owner_or_admin ON public.companies
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

-- ─── contacts ───
DROP POLICY IF EXISTS contacts_select_authenticated ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_owner ON public.contacts;
DROP POLICY IF EXISTS contacts_update_owner_or_admin ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_owner_or_admin ON public.contacts;

CREATE POLICY contacts_select_authenticated ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY contacts_insert_owner ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY contacts_update_owner_or_admin ON public.contacts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY contacts_delete_owner_or_admin ON public.contacts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

-- ─── reminders ───
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

-- ─── timeline ───
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

-- ─── email_log ───
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

-- ─── profiles + user_settings ───
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;

CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own_or_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()));

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_app_admin()));

DROP POLICY IF EXISTS user_settings_own_all ON public.user_settings;

CREATE POLICY user_settings_own_all ON public.user_settings
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── comments + comment_attachments ───
DROP POLICY IF EXISTS comments_select_collaborative ON public.comments;
DROP POLICY IF EXISTS comments_insert_collaborative ON public.comments;
DROP POLICY IF EXISTS comments_update_moderator_or_admin ON public.comments;
DROP POLICY IF EXISTS comments_delete_moderator_or_admin ON public.comments;

CREATE POLICY comments_select_collaborative ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.deleted_at IS NULL
          OR co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  );

CREATE POLICY comments_insert_collaborative ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND co.deleted_at IS NULL
    )
  );

CREATE POLICY comments_update_moderator_or_admin ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  );

CREATE POLICY comments_delete_moderator_or_admin ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  );

DROP POLICY IF EXISTS comment_attachments_select ON public.comment_attachments;
DROP POLICY IF EXISTS comment_attachments_insert ON public.comment_attachments;
DROP POLICY IF EXISTS comment_attachments_delete ON public.comment_attachments;

CREATE POLICY comment_attachments_select ON public.comment_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments AS c
      JOIN public.companies AS co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND (
          co.deleted_at IS NULL
          OR co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  );

CREATE POLICY comment_attachments_insert ON public.comment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.comments AS c
      JOIN public.companies AS co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.created_by = (SELECT auth.uid())
        AND c.deleted_at IS NULL
        AND co.deleted_at IS NULL
    )
  );

CREATE POLICY comment_attachments_delete ON public.comment_attachments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments AS c
      JOIN public.companies AS co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.deleted_at IS NULL
        AND co.deleted_at IS NULL
        AND (
          c.created_by = (SELECT auth.uid())
          OR co.user_id = (SELECT auth.uid())
          OR (SELECT public.is_app_admin())
        )
    )
  );

COMMIT;
