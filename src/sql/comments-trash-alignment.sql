-- Aligns comments/attachments RLS with the rest of the CRM (timeline/contacts/reminders).
-- Enables the admin trash bin to list soft-deleted comments, restore them, and hard-delete.
-- Security model: the company owner gets full access. Defense-in-depth filters
-- (`created_by = auth.uid()` and `deleted_at IS NULL`) stay in the server actions and UI.
--
-- Apply after `comments-rls.sql`.

-- ---------------------------------------------------------------------------
-- comments: SELECT (include soft-deleted for admin trash view)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comments_select_company_owner" ON public.comments;

CREATE POLICY "comments_select_company_owner" ON public.comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- comments: UPDATE (allow company owner to soft-delete AND restore;
--   body edits still restricted to author by server action defense-in-depth)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comments_update_author_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_company_owner" ON public.comments;

CREATE POLICY "comments_update_company_owner" ON public.comments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- comments: DELETE (hard delete from admin trash; attachments cascade via FK)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comments_delete_company_owner" ON public.comments;

CREATE POLICY "comments_delete_company_owner" ON public.comments
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- comment_attachments: SELECT (drop deleted-only clause so restore UI could list
--   attachments for soft-deleted comments in the future)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comment_attachments_select" ON public.comment_attachments;

CREATE POLICY "comment_attachments_select" ON public.comment_attachments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.comments c
      JOIN public.companies co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND co.user_id = auth.uid()
    )
  );
