BEGIN;
ALTER TABLE public.standortanalyse_scores
  DROP CONSTRAINT IF EXISTS standortanalyse_scores_status_check;
ALTER TABLE public.standortanalyse_scores
  ADD CONSTRAINT standortanalyse_scores_status_check
  CHECK (
    status IS NULL
    OR status IN ('Gut', 'Mittel', 'Kritisch')
    OR criterion_type = 'info'
  );
COMMIT;
