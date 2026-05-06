-- Seed: Original 12 AI Models from the hardcoded registry
-- Run this in Supabase SQL Editor after creating the ai_available_models table

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
  ('xai/grok-4.1-fast-non-reasoning', 'Grok 4.1 Fast', 'xAI', 4, 'high', 'low', 'Fast & Cheap', 'outline', '["company-research"]', true),
  ('xai/grok-4.1-fast-reasoning', 'Grok 4.1 Fast (reasoning)', 'xAI', 4, 'medium', 'medium', 'Fast & Cheap', 'outline', '["company-research"]', true),
  ('xai/grok-4-fast-non-reasoning', 'Grok 4 Fast', 'xAI', 3, 'high', 'low', 'Fast & Cheap', 'outline', '["company-research"]', true)
ON CONFLICT (gateway_id) DO UPDATE SET
  label = EXCLUDED.label,
  provider = EXCLUDED.provider,
  quality_score = EXCLUDED.quality_score,
  speed_tier = EXCLUDED.speed_tier,
  cost_tier = EXCLUDED.cost_tier,
  badge_text = EXCLUDED.badge_text,
  badge_variant = EXCLUDED.badge_variant,
  is_enabled = EXCLUDED.is_enabled;
