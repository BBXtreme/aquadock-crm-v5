DROP POLICY IF EXISTS "comments_select_company_owner" ON public.comments;
CREATE POLICY "comments_select_company_owner" ON public.comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.companies co
      WHERE co.id = comments.entity_id AND co.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "comments_update_author_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_company_owner" ON public.comments;
CREATE POLICY "comments_update_company_owner" ON public.comments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.companies co
      WHERE co.id = comments.entity_id AND co.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.companies co
      WHERE co.id = comments.entity_id AND co.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "comments_delete_company_owner" ON public.comments;
CREATE POLICY "comments_delete_company_owner" ON public.comments
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.companies co
      WHERE co.id = comments.entity_id AND co.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "comment_attachments_select" ON public.comment_attachments;
CREATE POLICY "comment_attachments_select" ON public.comment_attachments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.comments c
      JOIN public.companies co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id AND co.user_id = auth.uid()
    )
  );;
