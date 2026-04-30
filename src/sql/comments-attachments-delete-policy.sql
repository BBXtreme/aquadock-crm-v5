-- DELETE attachment metadata: comment author OR company record owner OR app admin.
-- Prerequisites: comments-rls.sql, comments-trash-alignment.sql, rls-helpers.sql.

DROP POLICY IF EXISTS "comment_attachments_delete" ON public.comment_attachments;

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
          c.created_by = auth.uid()
          OR co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  );
