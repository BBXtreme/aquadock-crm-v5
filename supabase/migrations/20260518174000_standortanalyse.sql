BEGIN;

CREATE TABLE IF NOT EXISTS public.standortanalysen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid NULL REFERENCES public.contacts (id) ON DELETE SET NULL,
  company_id uuid NULL REFERENCES public.companies (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'completed')),
  kontakt_name text NOT NULL,
  kontakt_vorname text NOT NULL,
  kontakt_email text NOT NULL,
  kontakt_strasse text NULL,
  kontakt_plz text NULL,
  kontakt_ort text NULL,
  kontakt_telefon text NULL,
  kontakt_firma text NULL,
  standort_plz text NOT NULL,
  standort_ort text NOT NULL,
  standort_strasse text NULL,
  standort_land text NOT NULL,
  standort_datum date NOT NULL DEFAULT current_date,
  erstellt_von text NULL,
  notizen text NULL,
  total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  recommendation text NOT NULL DEFAULT 'Unsicher',
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.standortanalyse_scores (
  analysis_id uuid NOT NULL REFERENCES public.standortanalysen (id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  criterion_type text NOT NULL CHECK (criterion_type IN ('main', 'optional', 'info')),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  max_points integer NOT NULL DEFAULT 0 CHECK (max_points >= 0),
  status text NULL CHECK (status IN ('Gut', 'Mittel', 'Kritisch')),
  is_unknown boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (analysis_id, criterion_key)
);

CREATE TABLE IF NOT EXISTS public.standortanalyse_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.standortanalysen (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  password_hash text NULL,
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_standortanalysen_user_status
  ON public.standortanalysen (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_standortanalyse_scores_analysis
  ON public.standortanalyse_scores (analysis_id);

CREATE INDEX IF NOT EXISTS idx_standortanalyse_share_links_analysis
  ON public.standortanalyse_share_links (analysis_id, is_active, expires_at DESC);

CREATE OR REPLACE FUNCTION public.set_standortanalysen_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_standortanalysen_updated_at ON public.standortanalysen;
CREATE TRIGGER trg_standortanalysen_updated_at
BEFORE UPDATE ON public.standortanalysen
FOR EACH ROW
EXECUTE FUNCTION public.set_standortanalysen_updated_at();

ALTER TABLE public.standortanalysen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standortanalyse_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standortanalyse_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS standortanalysen_select_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_select_owner ON public.standortanalysen
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.user_has_role('admin'));

DROP POLICY IF EXISTS standortanalysen_insert_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_insert_owner ON public.standortanalysen
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.user_has_role('admin'));

DROP POLICY IF EXISTS standortanalysen_update_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_update_owner ON public.standortanalysen
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.user_has_role('admin'))
WITH CHECK (user_id = auth.uid() OR public.user_has_role('admin'));

DROP POLICY IF EXISTS standortanalysen_delete_owner ON public.standortanalysen;
CREATE POLICY standortanalysen_delete_owner ON public.standortanalysen
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.user_has_role('admin'));

DROP POLICY IF EXISTS standortanalyse_scores_select_owner ON public.standortanalyse_scores;
CREATE POLICY standortanalyse_scores_select_owner ON public.standortanalyse_scores
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_scores.analysis_id
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.standortanalysen sa
    WHERE sa.id = standortanalyse_share_links.analysis_id
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
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
      AND (sa.user_id = auth.uid() OR public.user_has_role('admin'))
  )
);

COMMIT;
