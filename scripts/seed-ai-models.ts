/**
 * Seed script: Creates (if needed) and populates ai_available_models
 * with the original 12 hardcoded models from the CRM.
 *
 * Usage:
 *   pnpm seed:ai-models
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("   Please add them to run the seed script.");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Checks if the ai_available_models table exists.
 * If not, prints clear instructions and exits.
 */
async function ensureTableExists(): Promise<void> {
  const { error } = await supabase
    .from("ai_available_models")
    .select("id")
    .limit(1);

  if (error && error.code === "PGRST205") {
    console.error("\n❌ Table 'ai_available_models' does not exist yet.");
    console.error("   Please run the setup SQL first:");
    console.error("   → Open Supabase SQL Editor and execute: scripts/setup-ai-models.sql\n");
    process.exit(1);
  }

  if (error) {
    console.error("❌ Unexpected error checking table:", error.message);
    process.exit(1);
  }
}

const models = [
  {
    gateway_id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    quality_score: 5,
    speed_tier: "medium",
    cost_tier: "medium",
    badge_text: "Recommended for Quality",
    badge_variant: "default",
    is_enabled: true,
  },
  {
    gateway_id: "anthropic/claude-opus-4.6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    quality_score: 5,
    speed_tier: "low",
    cost_tier: "high",
    badge_text: "Highest quality",
    badge_variant: "default",
    is_enabled: true,
  },
  {
    gateway_id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    quality_score: 3,
    speed_tier: "high",
    cost_tier: "low",
    badge_text: "Fast turnaround",
    badge_variant: "outline",
    is_enabled: true,
  },
  {
    gateway_id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "OpenAI",
    quality_score: 4,
    speed_tier: "medium",
    cost_tier: "medium",
    badge_text: null,
    badge_variant: null,
    is_enabled: true,
  },
  {
    gateway_id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "OpenAI",
    quality_score: 3,
    speed_tier: "high",
    cost_tier: "low",
    badge_text: null,
    badge_variant: null,
    is_enabled: true,
  },
  {
    gateway_id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    provider: "OpenAI",
    quality_score: 3,
    speed_tier: "high",
    cost_tier: "low",
    badge_text: null,
    badge_variant: null,
    is_enabled: true,
  },
  {
    gateway_id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
    quality_score: 4,
    speed_tier: "high",
    cost_tier: "low",
    badge_text: null,
    badge_variant: null,
    is_enabled: true,
  },
  {
    gateway_id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    quality_score: 5,
    speed_tier: "medium",
    cost_tier: "medium",
    badge_text: null,
    badge_variant: null,
    is_enabled: true,
  },
  {
    gateway_id: "google/gemini-3-flash",
    label: "Gemini 3.1 Flash",
    provider: "Google",
    quality_score: 4,
    speed_tier: "high",
    cost_tier: "low",
    badge_text: "Best Price/Performance",
    badge_variant: "secondary",
    is_enabled: true,
  },
  // New recommended model
  {
    gateway_id: "xai/grok-4.3",
    label: "Grok 4.3",
    provider: "xAI",
    quality_score: 5,
    speed_tier: "medium",
    cost_tier: "medium",
    badge_text: "Recommended",
    badge_variant: "default",
    is_enabled: true,
  },
];

async function seed() {
  await ensureTableExists();

  console.log("Seeding ai_available_models...");

  // First, disable any deprecated models that might still exist in DB
  const deprecatedIds = [
    "xai/grok-4.1-fast-non-reasoning",
    "xai/grok-4.1-fast-reasoning",
    "xai/grok-4-fast-non-reasoning",
  ];

  await supabase
    .from("ai_available_models")
    .update({ is_enabled: false })
    .in("gateway_id", deprecatedIds);

  // Seed / update active models
  const { error } = await supabase
    .from("ai_available_models")
    .upsert(
      models.map((m) => ({
        ...m,
        recommended_for: ["company-research"],
      })),
      { onConflict: "gateway_id" },
    );

  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${models.length} AI models.`);
  console.log("   Deprecated models have been disabled.");
}

seed();
