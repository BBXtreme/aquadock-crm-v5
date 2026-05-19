BEGIN;
-- Reduce advisor warnings:
-- 1) Pin function search_path
-- 2) Wrap auth/user_has_role calls in SELECT within RLS predicates

ALTER FUNCTION public.set_standortanalysen_updated_at()
SET search_path = public, pg_temp;
DROP POLICY IF EXISTS standortanalysen_select_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_select_owner ON public.standortanalysen
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT public.user_has_role('admin'))
);
DROP POLICY IF EXISTS standortanalysen_insert_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_insert_owner ON public.standortanalysen
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT public.user_has_role('admin'))
);
DROP POLICY IF EXISTS standortanalysen_update_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_update_owner ON public.standortanalysen
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT public.user_has_role('admin'))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT public.user_has_role('admin'))
);
DROP POLICY IF EXISTS standortanalysen_delete_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_delete_owner ON public.standortanalysen
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT public.user_has_role('admin'))
);
DROP POLICY IF EXISTS standortanalyse_scores_select_owner ON public.standortanalyse_scores;
CREATE POLICY standortanalyse_scores_select_owner ON public.standortanalyse_scores
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_scores_insert_owner ON public.standortanalyse_scores;
CREATE POLICY standortanalyse_scores_insert_owner ON public.standortanalyse_scores
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_scores_update_owner ON public.standortanalyse_scores;
CREATE POLICY standortanalyse_scores_update_owner ON public.standortanalyse_scores
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_scores_delete_owner ON public.standortanalyse_scores;
CREATE POLICY standortanalyse_scores_delete_owner ON public.standortanalyse_scores
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_share_links_select_owner ON public.standortanalyse_share_links;
CREATE POLICY standortanalyse_share_links_select_owner ON public.standortanalyse_share_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_share_links_insert_owner ON public.standortanalyse_share_links;
CREATE POLICY standortanalyse_share_links_insert_owner ON public.standortanalyse_share_links
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_share_links_update_owner ON public.standortanalyse_share_links;
CREATE POLICY standortanalyse_share_links_update_owner ON public.standortanalyse_share_links
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
DROP POLICY IF EXISTS standortanalyse_share_links_delete_owner ON public.standortanalyse_share_links;
CREATE POLICY standortanalyse_share_links_delete_owner ON public.standortanalyse_share_links
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (
        sa.user_id = (SELECT auth.uid())
        OR (SELECT public.user_has_role('admin'))
      )
  )
);
COMMIT;
