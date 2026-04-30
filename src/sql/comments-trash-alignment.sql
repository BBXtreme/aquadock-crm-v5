-- Moderation: company RECORD owner (companies.user_id) and app admins may UPDATE/DELETE comments
-- on that company (restore, soft-delete, hard-delete). Markdown edits remain author-only in server actions.
--
-- Prerequisites: comments-rls.sql (collaborative SELECT + INSERT).
-- Apply before comments-attachments-delete-policy.sql.

DROP POLICY IF EXISTS "comments_update_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_moderator_or_admin" ON public.comments;

CREATE POLICY comments_update_moderator_or_admin ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  );

DROP POLICY IF EXISTS "comments_delete_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_moderator_or_admin" ON public.comments;

CREATE POLICY comments_delete_moderator_or_admin ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND (
          co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  );
