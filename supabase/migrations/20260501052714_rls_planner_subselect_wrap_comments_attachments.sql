BEGIN;

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

COMMIT;;
