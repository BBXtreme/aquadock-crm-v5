-- Row Level Security for public.comments and public.comment_attachments.
-- Aligns with company ownership: same user_id access as companies in rls-setup.sql.

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- Comments policies
DROP POLICY IF EXISTS "comments_select_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_author_company_owner" ON public.comments;

CREATE POLICY "comments_select_company_owner" ON public.comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  );

CREATE POLICY "comments_insert_company_owner" ON public.comments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  );

CREATE POLICY "comments_update_author_company_owner" ON public.comments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies co
      WHERE co.id = comments.entity_id
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  );

-- Attachments (schema for later; mirror comment access)
DROP POLICY IF EXISTS "comment_attachments_select" ON public.comment_attachments;
DROP POLICY IF EXISTS "comment_attachments_insert" ON public.comment_attachments;

CREATE POLICY "comment_attachments_select" ON public.comment_attachments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.comments c
      JOIN public.companies co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.deleted_at IS NULL
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  );

CREATE POLICY "comment_attachments_insert" ON public.comment_attachments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.comments c
      JOIN public.companies co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.created_by = auth.uid()
        AND c.deleted_at IS NULL
        AND co.user_id = auth.uid()
        AND co.deleted_at IS NULL
    )
  );
