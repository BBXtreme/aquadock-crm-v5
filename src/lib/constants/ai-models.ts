// Central registry for AI Gateway models used in CRM enrichment UI (labels, tiers, task badges).
// Dynamic Model Registry: DB (is_enabled=true) is the primary source, env extras override, hardcoded is fallback/seed.
// All existing badges, xAI BYOK logic, and getCompanyResearchBadge remain unchanged.

import { unstable_cache } from "next/cache";
import { type AiAvailableModelRow, listAiModelsAction } from "@/lib/actions/ai-models";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES } from "@/lib/services/ai-enrichment-policy";

type EnrichmentGatewayModelId = (typeof ENRICHMENT_GATEWAY_MODEL_ID_CHOICES)[number];

export type EnrichmentTaskId = "company-research";

export type ModelSpeedTier = "low" | "medium" | "high";
export type ModelCostTier = "low" | "medium" | "high";

export type BadgeVariantName = "default" | "secondary" | "outline";

export type TaskBadgeDefinition = {
  text: string;
  variant: BadgeVariantName;
  /** Extra Tailwind for small, non-intrusive chips */
  className?: string;
};

export type CompanyResearchBadgePolicy = {
  default: TaskBadgeDefinition;
  /** Shown for xAI Grok-style models when CRM infers an xAI billing context (BYOK / Grok-only paths). */
  whenXaiByok?: TaskBadgeDefinition;
};

export type AiEnrichmentGatewayModelMeta = {
  id: EnrichmentGatewayModelId;
  /** Short UI label (German CRM audience). */
  label: string;
  provider: string;
  /** Subjective 1–5 for public company web research quality. */
  qualityForCompanyResearch: 1 | 2 | 3 | 4 | 5;
  speed: ModelSpeedTier;
  cost: ModelCostTier;
  /** Tasks this model is explicitly recommended for (future filters / sorting). */
  recommendedFor: readonly EnrichmentTaskId[];
  /** Task-specific recommendation chip for company web research. */
  companyResearchBadge?: CompanyResearchBadgePolicy;
  /** Whether the model is deprecated and should no longer be used for new enrichments. */
  deprecated?: boolean;
};

const _badge = (d: TaskBadgeDefinition): TaskBadgeDefinition => ({
  ...d,
  className: d.className ?? "shrink-0 px-1.5 py-0 text-[10px] font-medium leading-none",
});

const AI_ENRICHMENT_GATEWAY_MODEL_META = {
  "anthropic/claude-sonnet-4.6": {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    qualityForCompanyResearch: 5,
    speed: "medium",
    cost: "medium",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Recommended for Quality", variant: "default" }),
    },
  },
  "anthropic/claude-opus-4.6": {
    id: "anthropic/claude-opus-4.6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    qualityForCompanyResearch: 5,
    speed: "low",
    cost: "high",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Highest quality", variant: "default" }),
    },
  },
  "anthropic/claude-haiku-4.5": {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    qualityForCompanyResearch: 3,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Fast turnaround", variant: "outline" }),
    },
  },
  "openai/gpt-5.4": {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "OpenAI",
    qualityForCompanyResearch: 4,
    speed: "medium",
    cost: "medium",
    recommendedFor: ["company-research"],
  },
  "openai/gpt-5.4-mini": {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "OpenAI",
    qualityForCompanyResearch: 3,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
  },
  "openai/gpt-5-mini": {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    provider: "OpenAI",
    qualityForCompanyResearch: 3,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
  },
  "google/gemini-2.5-flash": {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
    qualityForCompanyResearch: 4,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
  },
  "google/gemini-2.5-pro": {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    qualityForCompanyResearch: 5,
    speed: "medium",
    cost: "medium",
    recommendedFor: ["company-research"],
  },
  "google/gemini-3-flash": {
    id: "google/gemini-3-flash",
    label: "Gemini 3.1 Flash",
    provider: "Google",
    qualityForCompanyResearch: 4,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Best Price/Performance", variant: "secondary" }),
    },
  },
  "xai/grok-4.3": {
    id: "xai/grok-4.3",
    label: "Grok 4.3",
    provider: "xAI",
    qualityForCompanyResearch: 5,
    speed: "medium",
    cost: "medium",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Recommended", variant: "default" }),
      whenXaiByok: _badge({ text: "Best with xAI Subscription", variant: "secondary" }),
    },
  },
} as const satisfies Record<string, AiEnrichmentGatewayModelMeta>;

/** Parse optional AI_ENRICHMENT_EXTRA_MODELS (same shape as required in task). Never throws. */
function parseExtraModels(): AiEnrichmentGatewayModelMeta[] {
  const raw = process.env.AI_ENRICHMENT_EXTRA_MODELS?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("[ai-models] AI_ENRICHMENT_EXTRA_MODELS must be a JSON array");
      return [];
    }
    const extras: AiEnrichmentGatewayModelMeta[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        console.warn("[ai-models] Skipping invalid extra model entry (not an object)");
        continue;
      }
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id) {
        console.warn("[ai-models] Skipping extra model without valid id");
        continue;
      }
      const label = typeof item.label === "string" ? item.label : id;
      const provider = typeof item.provider === "string" ? item.provider : "Custom";
      const quality = [1, 2, 3, 4, 5].includes(item.qualityForCompanyResearch) ? item.qualityForCompanyResearch : 3;
      const speed = ["low", "medium", "high"].includes(item.speed) ? item.speed : "medium";
      const cost = ["low", "medium", "high"].includes(item.cost) ? item.cost : "medium";
      const recommendedFor: readonly EnrichmentTaskId[] = Array.isArray(item.recommendedFor) && item.recommendedFor.includes("company-research")
        ? ["company-research"]
        : ["company-research"];
      const badge = item.companyResearchBadge && typeof item.companyResearchBadge === "object"
        ? {
            default: {
              text: item.companyResearchBadge.text ?? "Custom",
              variant: ["default", "secondary", "outline"].includes(item.companyResearchBadge.variant) ? item.companyResearchBadge.variant : "outline",
            },
          }
        : undefined;

      extras.push({
        id,
        label,
        provider,
        qualityForCompanyResearch: quality as 1 | 2 | 3 | 4 | 5,
        speed: speed as ModelSpeedTier,
        cost: cost as ModelCostTier,
        recommendedFor,
        ...(badge ? { companyResearchBadge: badge } : {}),
      });
    }
    return extras;
  } catch (err) {
    console.warn("[ai-models] Failed to parse AI_ENRICHMENT_EXTRA_MODELS:", err);
    return [];
  }
}

const EXTRA_MODELS = parseExtraModels();

/** Fetch enabled models from DB (cached + revalidated on admin CRUD). */
const fetchDbModels = unstable_cache(
  async (): Promise<AiEnrichmentGatewayModelMeta[]> => {
    try {
      const rows: AiAvailableModelRow[] = await listAiModelsAction();
      return rows
        .filter((r) => r.is_enabled)
        .map((r) => ({
          id: r.gateway_id as string,
          label: r.label,
          provider: r.provider,
          qualityForCompanyResearch: r.quality_score as 1 | 2 | 3 | 4 | 5,
          speed: r.speed_tier,
          cost: r.cost_tier,
          recommendedFor: ["company-research"],
          ...(r.badge_text
            ? {
                companyResearchBadge: {
                  default: {
                    text: r.badge_text,
                    variant: (r.badge_variant ?? "outline") as BadgeVariantName,
                  },
                },
              }
            : {}),
        }));
    } catch (err) {
      // Table may not exist yet during rollout
      console.warn("[ai-models] Failed to fetch DB models:", err);
      return [];
    }
  },
  ["ai-models-db"],
  { tags: ["ai-models"], revalidate: 3600 },
);

/** Full dynamic getter: DB (enabled) → Env Extras → Hardcoded fallback.
 *  Deprecated models are excluded from enrichment selectors.
 */
export async function getAiEnrichmentModels(): Promise<readonly AiEnrichmentGatewayModelMeta[]> {
  const dbModels = await fetchDbModels();
  const _base = new Map(Object.entries(AI_ENRICHMENT_GATEWAY_MODEL_META));
  const seen = new Set<string>();

  const result: AiEnrichmentGatewayModelMeta[] = [];

  // DB first
  for (const m of dbModels) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      result.push(m);
    }
  }

  // Env extras override
  for (const extra of EXTRA_MODELS) {
    if (!seen.has(extra.id)) {
      seen.add(extra.id);
      result.push(extra);
    }
  }

  // Hardcoded fallback for any missing base models
  for (const [, meta] of Object.entries(AI_ENRICHMENT_GATEWAY_MODEL_META)) {
    if (!seen.has(meta.id)) {
      seen.add(meta.id);
      result.push(meta);
    }
  }

  // Filter out deprecated models for enrichment use
  return result.filter((m) => !m.deprecated);
}

/** Build final META_BY_ID for sync consumers (hardcoded + env). DB is loaded async via getAiEnrichmentModels. */
const META_BY_ID: ReadonlyMap<string, AiEnrichmentGatewayModelMeta> = (() => {
  const base = new Map<string, AiEnrichmentGatewayModelMeta>(Object.entries(AI_ENRICHMENT_GATEWAY_MODEL_META));
  for (const extra of EXTRA_MODELS) {
    base.set(extra.id, extra);
  }
  return base;
})();

function assertRegistryCoversPolicy(): void {
  for (const id of ENRICHMENT_GATEWAY_MODEL_ID_CHOICES) {
    if (!META_BY_ID.has(id)) {
      throw new Error(`ai-models registry missing metadata for gateway id: ${id}`);
    }
  }
}

assertRegistryCoversPolicy();

/** Ordered list for selects (base + extras appended, deduplicated by id). */
export function listEnrichmentGatewayModelsOrdered(): readonly AiEnrichmentGatewayModelMeta[] {
  const seen = new Set<string>();
  const result: AiEnrichmentGatewayModelMeta[] = [];
  for (const id of ENRICHMENT_GATEWAY_MODEL_ID_CHOICES) {
    const meta = META_BY_ID.get(id);
    if (meta && !seen.has(id)) {
      seen.add(id);
      result.push(meta);
    }
  }
  for (const extra of EXTRA_MODELS) {
    if (!seen.has(extra.id)) {
      seen.add(extra.id);
      result.push(extra);
    }
  }
  return result;
}

export function getEnrichmentGatewayModelMeta(modelId: string): AiEnrichmentGatewayModelMeta | undefined {
  return META_BY_ID.get(modelId);
}

export type CompanyResearchBadgeOptions = {
  /**
   * When true, Grok-style entries prefer `whenXaiByok` copy (client infers xAI billing context from settings / modal).
   * Does not read server env; callers set from UI context (e.g. Grok-only mode or xAI models in policy).
   */
  xaiBillingContext?: boolean;
};

export function getCompanyResearchBadge(
  modelId: string,
  options?: CompanyResearchBadgeOptions,
): TaskBadgeDefinition | null {
  const meta = META_BY_ID.get(modelId);
  const policy = meta?.companyResearchBadge;
  if (!policy) {
    return null;
  }
  const whenXaiByok = policy.whenXaiByok;
  if (options?.xaiBillingContext === true && whenXaiByok !== undefined && modelId.startsWith("xai/")) {
    return whenXaiByok;
  }
  return policy.default;
}

/** Badge for “Grok only (this run)” when no single gateway id is shown. */
export const GROK_ONLY_SESSION_BADGE: TaskBadgeDefinition = _badge({
  text: "xAI Grok pool",
  variant: "outline",
});
