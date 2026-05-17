-- Async AI batch jobs (e.g. xAI Batch API polling). RLS: users see own rows; worker uses service role.
-- Prefer supabase/migrations/20260506130000_ai_batch_jobs.sql for versioned deploys; this file is a one-shot copy for Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.ai_batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  external_batch_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress jsonb,
  result_summary jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_batch_jobs_status_check CHECK (
    status = ANY (
      ARRAY[
        'queued'::text,
        'submitted'::text,
        'processing'::text,
        'completed'::text,
        'failed'::text,
        'cancelled'::text
      ]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_user_created ON public.ai_batch_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_pending ON public.ai_batch_jobs (status)
WHERE
  status = ANY (ARRAY['queued'::text, 'submitted'::text, 'processing'::text]);

COMMENT ON TABLE public.ai_batch_jobs IS 'Background AI jobs (xAI Batch, future batch re-embed). Inserts/updates from workers use service role.';

CREATE OR REPLACE FUNCTION public.set_ai_batch_jobs_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_batch_jobs_updated_at ON public.ai_batch_jobs;

CREATE TRIGGER trg_ai_batch_jobs_updated_at
BEFORE UPDATE ON public.ai_batch_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_ai_batch_jobs_updated_at ();

ALTER TABLE public.ai_batch_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_batch_jobs_select_own ON public.ai_batch_jobs;

CREATE POLICY ai_batch_jobs_select_own ON public.ai_batch_jobs
FOR SELECT TO authenticated
USING (user_id = auth.uid ());

DROP POLICY IF EXISTS ai_batch_jobs_insert_own ON public.ai_batch_jobs;

CREATE POLICY ai_batch_jobs_insert_own ON public.ai_batch_jobs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid ());

DROP POLICY IF EXISTS ai_batch_jobs_update_cancel ON public.ai_batch_jobs;

CREATE POLICY ai_batch_jobs_update_cancel ON public.ai_batch_jobs
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid ()
  AND status = ANY (ARRAY['queued'::text, 'submitted'::text])
)
WITH CHECK (
  user_id = auth.uid ()
  AND status = 'cancelled'::text
);
