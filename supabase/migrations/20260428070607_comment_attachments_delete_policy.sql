DROP POLICY IF EXISTS "comment_attachments_delete" ON public.comment_attachments;

CREATE POLICY "comment_attachments_delete" ON public.comment_attachments
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.comments c
      JOIN public.companies co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.created_by = auth.uid()
        AND co.user_id = auth.uid()
        AND c.deleted_at IS NULL
        AND co.deleted_at IS NULL
    )
  );;
