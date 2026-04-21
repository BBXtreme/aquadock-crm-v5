-- src/sql/storage-feedback-screenshots-bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can upload own feedback screenshots" ON storage.objects;
CREATE POLICY "Users can upload own feedback screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own feedback screenshots" ON storage.objects;
CREATE POLICY "Users can update own feedback screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own feedback screenshots" ON storage.objects;
CREATE POLICY "Users can delete own feedback screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Feedback screenshots are publicly readable" ON storage.objects;
CREATE POLICY "Feedback screenshots are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-screenshots');
