-- ============================================================================
-- ONE-TIME SETUP: AI Model Registry (Dynamic Model Registry - Phase 2)
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor.
-- It will:
--   1. Create the ai_available_models table (if it doesn't exist)
--   2. Set up RLS policies (admin-only)
--   3. Seed the current active models (deprecated Grok fast models removed)
-- ============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS ai_available_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id text NOT NULL UNIQUE,
  label text NOT NULL,
  provider text NOT NULL,
  quality_score smallint NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  speed_tier text NOT NULL CHECK (speed_tier IN ('low', 'medium', 'high')),
  cost_tier text NOT NULL CHECK (cost_tier IN ('low', 'medium', 'high')),
  badge_text text,
  badge_variant text CHECK (badge_variant IN ('default', 'secondary', 'outline')),
  recommended_for jsonb NOT NULL DEFAULT '["company-research"]'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE ai_available_models ENABLE ROW LEVEL SECURITY;

-- 3. Admin-only policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_available_models' 
    AND policyname = 'ai_available_models_admin_all'
  ) THEN
    CREATE POLICY "ai_available_models_admin_all" ON ai_available_models
      FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());
  END IF;
END $$;

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_available_models_set_updated_at ON ai_available_models;
CREATE TRIGGER ai_available_models_set_updated_at
  BEFORE UPDATE ON ai_available_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Helpful index
CREATE INDEX IF NOT EXISTS idx_ai_available_models_enabled 
  ON ai_available_models (is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- 6. Seed the original 12 models (idempotent)
-- ============================================================================
INSERT INTO ai_available_models (gateway_id, label, provider, quality_score, speed_tier, cost_tier, badge_text, badge_variant, recommended_for, is_enabled)
VALUES
  ('anthropic/claude-sonnet-4.6', 'Claude Sonnet 4.6', 'Anthropic', 5, 'medium', 'medium', 'Recommended for Quality', 'default', '["company-research"]', true),
  ('anthropic/claude-opus-4.6', 'Claude Opus 4.6', 'Anthropic', 5, 'low', 'high', 'Highest quality', 'default', '["company-research"]', true),
  ('anthropic/claude-haiku-4.5', 'Claude Haiku 4.5', 'Anthropic', 3, 'high', 'low', 'Fast turnaround', 'outline', '["company-research"]', true),
  ('openai/gpt-5.4', 'GPT-5.4', 'OpenAI', 4, 'medium', 'medium', NULL, NULL, '["company-research"]', true),
  ('openai/gpt-5.4-mini', 'GPT-5.4 Mini', 'OpenAI', 3, 'high', 'low', NULL, NULL, '["company-research"]', true),
  ('openai/gpt-5-mini', 'GPT-5 Mini', 'OpenAI', 3, 'high', 'low', NULL, NULL, '["company-research"]', true),
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 4, 'high', 'low', NULL, NULL, '["company-research"]', true),
  ('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', 5, 'medium', 'medium', NULL, NULL, '["company-research"]', true),
  ('google/gemini-3-flash', 'Gemini 3.1 Flash', 'Google', 4, 'high', 'low', 'Best Price/Performance', 'secondary', '["company-research"]', true),
  -- New recommended model
  ('xai/grok-4.3', 'Grok 4.3', 'xAI', 5, 'medium', 'medium', 'Recommended', 'default', '["company-research"]', true)
ON CONFLICT (gateway_id) DO UPDATE SET
  label = EXCLUDED.label,
  provider = EXCLUDED.provider,
  quality_score = EXCLUDED.quality_score,
  speed_tier = EXCLUDED.speed_tier,
  cost_tier = EXCLUDED.cost_tier,
  badge_text = EXCLUDED.badge_text,
  badge_variant = EXCLUDED.badge_variant,
  is_enabled = EXCLUDED.is_enabled;

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'AI Model Registry setup complete. ' || COUNT(*) || ' models seeded.' AS status
FROM ai_available_models;
;
