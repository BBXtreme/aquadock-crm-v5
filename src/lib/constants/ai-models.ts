// Central registry for AI Gateway models used in CRM enrichment UI (labels, tiers, task badges).
// Keep in sync with `ENRICHMENT_GATEWAY_MODEL_ID_CHOICES` in `ai-enrichment-policy.ts`.

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
  "xai/grok-4.1-fast-non-reasoning": {
    id: "xai/grok-4.1-fast-non-reasoning",
    label: "Grok 4.1 Fast",
    provider: "xAI",
    qualityForCompanyResearch: 4,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Fast & Cheap", variant: "outline" }),
      whenXaiByok: _badge({ text: "Best with xAI Subscription", variant: "secondary" }),
    },
  },
  "xai/grok-4.1-fast-reasoning": {
    id: "xai/grok-4.1-fast-reasoning",
    label: "Grok 4.1 Fast (reasoning)",
    provider: "xAI",
    qualityForCompanyResearch: 4,
    speed: "medium",
    cost: "medium",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Fast & Cheap", variant: "outline" }),
      whenXaiByok: _badge({ text: "Best with xAI Subscription", variant: "secondary" }),
    },
  },
  "xai/grok-4-fast-non-reasoning": {
    id: "xai/grok-4-fast-non-reasoning",
    label: "Grok 4 Fast",
    provider: "xAI",
    qualityForCompanyResearch: 3,
    speed: "high",
    cost: "low",
    recommendedFor: ["company-research"],
    companyResearchBadge: {
      default: _badge({ text: "Fast & Cheap", variant: "outline" }),
      whenXaiByok: _badge({ text: "Best with xAI Subscription", variant: "secondary" }),
    },
  },
} as const satisfies Record<EnrichmentGatewayModelId, AiEnrichmentGatewayModelMeta>;

const META_BY_ID: ReadonlyMap<string, AiEnrichmentGatewayModelMeta> = new Map(
  (Object.keys(AI_ENRICHMENT_GATEWAY_MODEL_META) as EnrichmentGatewayModelId[]).map((k) => [
    k,
    AI_ENRICHMENT_GATEWAY_MODEL_META[k],
  ]),
);

function assertRegistryCoversPolicy(): void {
  for (const id of ENRICHMENT_GATEWAY_MODEL_ID_CHOICES) {
    if (!META_BY_ID.has(id)) {
      throw new Error(`ai-models registry missing metadata for gateway id: ${id}`);
    }
  }
}

assertRegistryCoversPolicy();

/** Ordered list for selects (matches policy / EAV validation order). */
export function listEnrichmentGatewayModelsOrdered(): readonly AiEnrichmentGatewayModelMeta[] {
  return ENRICHMENT_GATEWAY_MODEL_ID_CHOICES.map((id) => META_BY_ID.get(id) as AiEnrichmentGatewayModelMeta);
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
