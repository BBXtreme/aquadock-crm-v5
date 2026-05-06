-- Phase 2: Dynamic Model Registry – admin-managed AI gateway models
-- Only is_app_admin() can read/write. Regular users see the list via the cached registry.

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

-- RLS: only app admins can manage the registry
ALTER TABLE ai_available_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_available_models_admin_all" ON ai_available_models
  FOR ALL
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- updated_at trigger (reuse existing pattern if present)
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

-- Helpful index for enabled models
CREATE INDEX IF NOT EXISTS idx_ai_available_models_enabled ON ai_available_models (is_enabled) WHERE is_enabled = true;