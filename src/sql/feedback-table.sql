-- src/sql/feedback-table.sql
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('general', 'bug', 'feature', 'ux', 'openmap', 'email', 'ai', 'other')),
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  sentiment text NOT NULL CHECK (sentiment IN (E'\uD83D\uDE0A', E'\uD83D\uDE42', E'\uD83D\uDE10', E'\uD83D\uDE41', E'\uD83D\uDE22')),
  page_url text CHECK (page_url IS NULL OR char_length(page_url) <= 2048),
  screenshot_url text CHECK (screenshot_url IS NULL OR char_length(screenshot_url) <= 4096),
  screenshot_path text CHECK (screenshot_path IS NULL OR char_length(screenshot_path) <= 1024),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_screenshot_pair_ok CHECK (
    (screenshot_url IS NULL AND screenshot_path IS NULL)
    OR (screenshot_url IS NOT NULL AND screenshot_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id_created_at ON public.feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_topic_created_at ON public.feedback (topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select_own_or_admin" ON public.feedback;
CREATE POLICY "feedback_select_own_or_admin"
ON public.feedback FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
CREATE POLICY "feedback_insert_own"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);
