// Server-side Vercel AI Gateway wiring for company + contact enrichment (user-selected primary, fixed Grok fallback).
// Low-cost mode: Gemini 3 Flash + Grok 4.1 Fast, fewer Perplexity results, tighter prompts.
// Optional xAI BYOK: set AI_ENRICHMENT_XAI_API_KEY so Grok calls bill your xAI subscription via AI Gateway.

import type { GatewayModelId } from "@ai-sdk/gateway";
import { GatewayError } from "@ai-sdk/gateway";
import { createGateway, generateText, Output, stepCountIs } from "ai";

import { fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type CompanyEnrichmentAiOutput,
  type CompanyEnrichmentResult,
  companyEnrichmentAiSchema,
  sanitizeEnrichmentOutput,
} from "@/lib/validations/company-enrichment";
import {
  type ContactEnrichmentAiOutput,
  type ContactEnrichmentResult,
  contactEnrichmentAiSchema,
  sanitizeContactEnrichmentOutput,
} from "@/lib/validations/contact-enrichment";

const ENRICHMENT_DIGEST_MAX_CHARS = 100_000;
const ENRICHMENT_DIGEST_MAX_CHARS_TIGHT = 72_000;

/** `user_settings.key` — must match `settings.ts` upsert for low-cost mode. */
const AI_ENRICHMENT_LOW_COST_USER_KEY = "ai_enrichment_low_cost" as const;

const LOW_COST_PRIMARY_MODEL: GatewayModelId = "google/gemini-3-flash";
const LOW_COST_SECONDARY_MODEL: GatewayModelId = "xai/grok-4.1-fast-non-reasoning";
const PERPLEXITY_MAX_RESULTS_DEFAULT = 5;
const PERPLEXITY_MAX_RESULTS_LOW_COST = 3;

type ResearchStepLike = {
  text?: string;
  toolResults?: unknown;
};

/** Collapses Perplexity + model text from phase 1 for the structuring prompt. */
function buildEnrichmentResearchDigest(
  researchResult: {
    text: string;
    steps: readonly ResearchStepLike[];
  },
  digestMaxChars?: number,
): string {
  const chunks: string[] = [];
  const push = (value: string) => {
    const t = value.trim();
    if (t.length === 0) return;
    chunks.push(t);
  };

  push(researchResult.text);
  for (const step of researchResult.steps) {
    if (typeof step.text === "string") {
      push(step.text);
    }
    if (step.toolResults !== undefined && step.toolResults !== null) {
      try {
        push(JSON.stringify(step.toolResults, null, 2));
      } catch {
        push(String(step.toolResults));
      }
    }
  }

  const body = chunks.join("\n\n---\n\n");
  if (body.length === 0) {
    return "(Keine Recherche-Textergebnisse. Setze unsichere Felder auf null.)";
  }
  const cap = digestMaxChars ?? ENRICHMENT_DIGEST_MAX_CHARS;
  if (body.length <= cap) {
    return body;
  }
  return `${body.slice(0, cap)}\n\n[… Digest gekürzt …]`;
}

function buildEnrichmentStructurePrompt(digest: string, promptTight: boolean): string {
  if (promptTight) {
    return `Recherche abgeschlossen. Nutze nur das Folgende, keine Tools mehr. JSON gemäß Schema (DE); URLs nur aus Quellen.

=== RECHERCHE ===
${digest}`;
  }
  return `Die Web-Recherche (perplexity_search) ist abgeschlossen. Nutze NUR die folgenden Roh-Ergebnisse. Erzeuge KEINE weiteren Tool-Aufrufe. Erzeuge jetzt das strukturierte JSON-Objekt gemäß dem vorgegebenen Schema (deutsche Texte; gültige URLs in Quellen nur aus den Ergebnissen).

=== RECHERCHE ===
${digest}`;
}

export const COMPANY_ENRICHMENT_PRIMARY_MODEL: GatewayModelId = "anthropic/claude-sonnet-4.6";
export const COMPANY_ENRICHMENT_FALLBACK_MODEL: GatewayModelId = "xai/grok-4.1-fast-non-reasoning";

/**
 * Optional override via `AI_ENRICHMENT_GROK_MODEL` (Gateway model id, e.g. `xai/grok-4.1-fast-non-reasoning`)
 * for Grok-only mode and Claude→Grok fallback. BYOK for xAI remains `AI_ENRICHMENT_XAI_API_KEY`.
 */
export function resolveEnrichmentGrokGatewayModelId(): GatewayModelId {
  const raw = process.env.AI_ENRICHMENT_GROK_MODEL?.trim();
  if (!raw) {
    return COMPANY_ENRICHMENT_FALLBACK_MODEL;
  }
  return raw as GatewayModelId;
}

export type EnrichmentModelMode = "auto" | "grok_only" | "claude_only";

/** German instructions appended when address/water proximity focus is enabled (company enrichment). */
export function buildCompanyEnrichmentAddressFocusInstructions(options?: { compact?: boolean }): string {
  if (options?.compact === true) {
    return `Adress-/Lage-Fokus: Nur Straße, PLZ, Ort, Land, Wasserdistanz/-typ aus belastbaren Web-Quellen; keine Koordinaten erfinden.`;
  }
  return `Adress- und Lage-Fokus: Priorisiere verlässliche, quellenbasierte Angaben zu Straße, PLZ, Ort, Bundesland und Land. Prüfe Wasserdistanz und Wassertyp nur bei belastbaren öffentlichen Hinweisen (Karten, Hafeninfos, Presse). Erfinde keine Koordinaten oder Postadressen.`;
}

type GatewayInstance = NonNullable<ReturnType<typeof createGateway>>;

function getGateway(): GatewayInstance | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) return null;
  return createGateway({ apiKey });
}

function jsonToBooleanUserSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

async function loadEnrichmentRuntimeConfig(): Promise<{
  primary: GatewayModelId;
  secondary: GatewayModelId;
  perplexityMaxResults: number;
  promptTight: boolean;
  digestMaxChars: number;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        primary: COMPANY_ENRICHMENT_PRIMARY_MODEL,
        secondary: resolveEnrichmentGrokGatewayModelId(),
        perplexityMaxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
        promptTight: false,
        digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS,
      };
    }
    const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
    const { data: lowCostRow } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", AI_ENRICHMENT_LOW_COST_USER_KEY)
      .maybeSingle();
    const lowCost = jsonToBooleanUserSetting(lowCostRow?.value, false);
    if (lowCost) {
      return {
        primary: LOW_COST_PRIMARY_MODEL,
        secondary: LOW_COST_SECONDARY_MODEL,
        perplexityMaxResults: PERPLEXITY_MAX_RESULTS_LOW_COST,
        promptTight: true,
        digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS_TIGHT,
      };
    }
    return {
      primary: policy.primaryGatewayModelId,
      secondary: resolveEnrichmentGrokGatewayModelId(),
      perplexityMaxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
      promptTight: false,
      digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS,
    };
  } catch {
    return {
      primary: COMPANY_ENRICHMENT_PRIMARY_MODEL,
      secondary: resolveEnrichmentGrokGatewayModelId(),
      perplexityMaxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
      promptTight: false,
      digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS,
    };
  }
}

function pickGrokOnlyModel(primary: GatewayModelId, secondary: GatewayModelId): GatewayModelId {
  if (primary.startsWith("xai/")) {
    return primary;
  }
  if (secondary.startsWith("xai/")) {
    return secondary;
  }
  return resolveEnrichmentGrokGatewayModelId();
}

/**
 * Optional provider options forwarded to the AI Gateway (BYOK for xAI / SuperGrok).
 * Shape matches AI Gateway `gateway` provider options (`byok` map).
 */
export function getEnrichmentGatewayProviderOptions():
  | NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>
  | undefined {
  const xaiKey = process.env.AI_ENRICHMENT_XAI_API_KEY?.trim();
  if (!xaiKey) return undefined;
  return {
    gateway: {
      byok: {
        xai: [{ apiKey: xaiKey }],
      },
    },
  };
}

export function createCompanyEnrichmentPerplexityTool(gateway: GatewayInstance, maxResults: number) {
  const capped = Math.max(1, Math.min(8, Math.floor(maxResults)));
  return gateway.tools.perplexitySearch({
    maxResults: capped,
    searchLanguageFilter: ["de"],
    searchRecencyFilter: "month",
  });
}

function shouldRetryWithFallback(error: unknown): boolean {
  if (GatewayError.isInstance(error)) return true;
  if (error instanceof Error) {
    return /429|503|timeout|ETIMEDOUT|ECONNRESET|rate/i.test(error.message);
  }
  return false;
}

export async function runCompanyEnrichmentGeneration(params: {
  system: string;
  userPrompt: string;
  modelMode?: EnrichmentModelMode;
  addressFocusPrioritize?: boolean;
  /** Optional per-request override of policy primary/secondary (validated by caller). */
  gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId };
}): Promise<{ result: CompanyEnrichmentResult; modelUsed: GatewayModelId }> {
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI_GATEWAY_MISSING");
  }

  const runtime = await loadEnrichmentRuntimeConfig();
  const addressFocus = params.addressFocusPrioritize === true;
  const systemPrefix = runtime.promptTight
    ? "Öffentliche Fakten nur aus Recherche-Ergebnissen; Antwort knapp halten bei gleicher JSON-Qualität und Schema-Treue.\n\n"
    : "";
  const system = addressFocus
    ? `${systemPrefix}${params.system}\n\n${buildCompanyEnrichmentAddressFocusInstructions({ compact: runtime.promptTight })}`
    : `${systemPrefix}${params.system}`;
  const userPrompt = addressFocus
    ? runtime.promptTight
      ? `${params.userPrompt}\n\nZusatz: Adress-/Gewässerfelder nur aus Quellen; sonst null.`
      : `${params.userPrompt}\n\nZusatz: Bitte Adress- und Gewässernähe-Felder (strasse, plz, stadt, bundesland, land, wasserdistanz, wassertyp) besonders sorgfältig prüfen und nur bei belastbaren Quellen befüllen.`
    : params.userPrompt;

  const tools = {
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway, runtime.perplexityMaxResults),
  };

  const output = Output.object({
    name: "CompanyEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für CRM-Felder.",
    schema: companyEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();
  const mode = params.modelMode ?? "auto";

  const primary = params.gatewayModelOverride?.primary ?? runtime.primary;
  const secondary = params.gatewayModelOverride?.secondary ?? runtime.secondary;

  const runWithModel = async (modelId: GatewayModelId) => {
    // Phase 1: provider-executed Perplexity tool — AI SDK only parses `output` when the last
    // step finishReason is "stop"; tool-only final steps throw AI_NoOutputGeneratedError.
    const researchResult = await generateText({
      model: gateway(modelId),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(12),
      system,
      prompt: userPrompt,
      ...(providerOptions ? { providerOptions } : {}),
    });

    const digest = buildEnrichmentResearchDigest(researchResult, runtime.digestMaxChars);
    const structurePrompt = buildEnrichmentStructurePrompt(digest, runtime.promptTight);

    const { output: raw } = await generateText({
      model: gateway(modelId),
      system,
      prompt: structurePrompt,
      output,
      stopWhen: stepCountIs(4),
      ...(providerOptions ? { providerOptions } : {}),
    });
    if (!raw) {
      throw new Error("ENRICHMENT_NO_OUTPUT");
    }
    return sanitizeEnrichmentOutput(raw as CompanyEnrichmentAiOutput);
  };

  if (mode === "grok_only") {
    const grokId = pickGrokOnlyModel(primary, secondary);
    const result = await runWithModel(grokId);
    return { result, modelUsed: grokId };
  }

  if (mode === "claude_only") {
    const result = await runWithModel(primary);
    return { result, modelUsed: primary };
  }

  try {
    const result = await runWithModel(primary);
    return { result, modelUsed: primary };
  } catch (first) {
    if (!shouldRetryWithFallback(first) || secondary === primary) {
      throw first;
    }
    const result = await runWithModel(secondary);
    return { result, modelUsed: secondary };
  }
}

export async function runContactEnrichmentGeneration(params: {
  system: string;
  userPrompt: string;
  modelMode?: EnrichmentModelMode;
  gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId };
}): Promise<{ result: ContactEnrichmentResult; modelUsed: GatewayModelId }> {
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI_GATEWAY_MISSING");
  }

  const runtime = await loadEnrichmentRuntimeConfig();
  const systemEffective = runtime.promptTight
    ? `Öffentliche Fakten nur aus Recherche; knapp halten, Schema exakt.\n\n${params.system}`
    : params.system;

  const tools = {
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway, runtime.perplexityMaxResults),
  };

  const output = Output.object({
    name: "ContactEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für Kontaktfelder.",
    schema: contactEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();
  const mode = params.modelMode ?? "auto";

  const primary = params.gatewayModelOverride?.primary ?? runtime.primary;
  const secondary = params.gatewayModelOverride?.secondary ?? runtime.secondary;

  const runWithModel = async (modelId: GatewayModelId) => {
    const researchResult = await generateText({
      model: gateway(modelId),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(12),
      system: systemEffective,
      prompt: params.userPrompt,
      ...(providerOptions ? { providerOptions } : {}),
    });

    const digest = buildEnrichmentResearchDigest(researchResult, runtime.digestMaxChars);
    const structurePrompt = buildEnrichmentStructurePrompt(digest, runtime.promptTight);

    const { output: raw } = await generateText({
      model: gateway(modelId),
      system: systemEffective,
      prompt: structurePrompt,
      output,
      stopWhen: stepCountIs(4),
      ...(providerOptions ? { providerOptions } : {}),
    });
    if (!raw) {
      throw new Error("ENRICHMENT_NO_OUTPUT");
    }
    return sanitizeContactEnrichmentOutput(raw as ContactEnrichmentAiOutput);
  };

  if (mode === "grok_only") {
    const grokId = pickGrokOnlyModel(primary, secondary);
    const result = await runWithModel(grokId);
    return { result, modelUsed: grokId };
  }

  if (mode === "claude_only") {
    const result = await runWithModel(primary);
    return { result, modelUsed: primary };
  }

  try {
    const result = await runWithModel(primary);
    return { result, modelUsed: primary };
  } catch (first) {
    if (!shouldRetryWithFallback(first) || secondary === primary) {
      throw first;
    }
    const result = await runWithModel(secondary);
    return { result, modelUsed: secondary };
  }
}
