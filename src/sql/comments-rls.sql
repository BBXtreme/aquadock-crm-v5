-- Row Level Security for public.comments and public.comment_attachments.
-- Collaborative read: authenticated users read threads on companies visible like core CRM SELECT.
-- INSERT: any authenticated user on an active (non-deleted) company; created_by = auth.uid().
--
-- Prerequisites: rls-helpers.sql, core-crm-rls-collaborative.sql (company SELECT policies).
-- Then apply comments-trash-alignment.sql (moderation UPDATE/DELETE).
-- Then comments-attachments-delete-policy.sql (attachment DELETE).

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_select_collaborative" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_collaborative" ON public.comments;
DROP POLICY IF EXISTS "comments_update_author_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_update_moderator_or_admin" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_company_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_moderator_or_admin" ON public.comments;

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
          OR co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  );

CREATE POLICY comments_insert_collaborative ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies AS co
      WHERE co.id = comments.entity_id
        AND co.deleted_at IS NULL
    )
  );

-- UPDATE / DELETE: comments-trash-alignment.sql

DROP POLICY IF EXISTS "comment_attachments_select" ON public.comment_attachments;
DROP POLICY IF EXISTS "comment_attachments_insert" ON public.comment_attachments;
DROP POLICY IF EXISTS "comment_attachments_delete" ON public.comment_attachments;

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
          OR co.user_id = auth.uid()
          OR public.is_app_admin()
        )
    )
  );

CREATE POLICY comment_attachments_insert ON public.comment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.comments AS c
      JOIN public.companies AS co ON co.id = c.entity_id
      WHERE c.id = comment_attachments.comment_id
        AND c.created_by = auth.uid()
        AND c.deleted_at IS NULL
        AND co.deleted_at IS NULL
    )
  );
