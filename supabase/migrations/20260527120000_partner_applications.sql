-- partner_applications: public Vertriebspartner / sales partner applications from aquadock-website.

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'interview', 'approved', 'rejected', 'withdrawn')),
  locale text NOT NULL CHECK (locale IN ('de', 'en')),

  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company_name text,

  country_code text NOT NULL,
  city_region text NOT NULL,
  proposed_territory text NOT NULL,

  years_sales_experience smallint NOT NULL CHECK (years_sales_experience >= 0),
  industry_experience text[] NOT NULL DEFAULT '{}',
  motivation text NOT NULL,

  cv_storage_path text,
  linkedin_url text,
  references_text text,

  tax_id text,
  handelsvertreter_ack boolean NOT NULL DEFAULT false,
  gdpr_consent boolean NOT NULL DEFAULT false,
  gdpr_consent_at timestamptz,

  source text NOT NULL DEFAULT 'website',
  ip_hash text,
  user_agent text,
  admin_notes text
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status
  ON public.partner_applications (status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_email_lower
  ON public.partner_applications (lower(email));
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at
  ON public.partner_applications (created_at DESC);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_applications_admin_all" ON public.partner_applications;
CREATE POLICY "partner_applications_admin_all"
ON public.partner_applications
FOR ALL
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));

CREATE OR REPLACE FUNCTION public.set_partner_applications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_applications_updated_at ON public.partner_applications;
CREATE TRIGGER trg_partner_applications_updated_at
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_partner_applications_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-applications',
  'partner-applications',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
