-- AquaDock CRM: private comment attachments bucket + storage RLS (run once per environment)
-- Object layout: "{company_uuid}/{comment_uuid}/{object_name}"
-- First segment must equal companies.id where companies.user_id = auth.uid() and company is active.
-- Matches app conventions in docs/SUPABASE_SCHEMA.md (comment_attachments.storage_object_path).

INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-files', 'comment-files', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Company owners upload comment-files" ON storage.objects;
CREATE POLICY "Company owners upload comment-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comment-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies co
    WHERE co.id::text = split_part(name::text, '/', 1)
      AND co.user_id = auth.uid()
      AND co.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Company owners read own comment-files" ON storage.objects;
CREATE POLICY "Company owners read own comment-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comment-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies co
    WHERE co.id::text = split_part(name::text, '/', 1)
      AND co.user_id = auth.uid()
      AND co.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Company owners update own comment-files" ON storage.objects;
CREATE POLICY "Company owners update own comment-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'comment-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies co
    WHERE co.id::text = split_part(name::text, '/', 1)
      AND co.user_id = auth.uid()
      AND co.deleted_at IS NULL
  )
)
WITH CHECK (
  bucket_id = 'comment-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies co
    WHERE co.id::text = split_part(name::text, '/', 1)
      AND co.user_id = auth.uid()
      AND co.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Company owners delete own comment-files" ON storage.objects;
CREATE POLICY "Company owners delete own comment-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comment-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies co
    WHERE co.id::text = split_part(name::text, '/', 1)
      AND co.user_id = auth.uid()
      AND co.deleted_at IS NULL
  )
);
