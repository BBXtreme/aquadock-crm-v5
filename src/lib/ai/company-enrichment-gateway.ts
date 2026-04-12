// Server-side Vercel AI Gateway wiring for company + contact enrichment.
// Phase 1 (Perplexity web search via tools) always uses a fast fixed research model (see ENRICHMENT_RESEARCH_GATEWAY_MODEL).
// Phase 2 (JSON structuring) uses the user’s structuring model from settings + optional modal override.
// Company modal passes `webSearchMode: "full" | "model-only"`; default `full` when omitted (bulk). Modal defaults to `model-only`.
// Optional xAI BYOK: set AI_ENRICHMENT_XAI_API_KEY so Grok calls bill your xAI subscription via AI Gateway.

import type { GatewayModelId } from "@ai-sdk/gateway";
import { GatewayError } from "@ai-sdk/gateway";
import { createGateway, generateText, Output, stepCountIs } from "ai";

import { buildCompanyEnrichmentClosedEnumPromptBlock } from "@/lib/ai/company-enrichment-closed-enums";
import { fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppearanceLocale } from "@/lib/validations/appearance";
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

/** Fixed Gateway model for enrichment phase 1 (tool calls incl. Perplexity). Structuring uses `runtime.primary` / override. */
const ENRICHMENT_RESEARCH_GATEWAY_MODEL: GatewayModelId = "google/gemini-3-flash";

const PERPLEXITY_MAX_RESULTS_DEFAULT = 5;

/** Company enrichment: web + structuring vs model-only structuring. Bulk uses `full`. */
export type CompanyEnrichmentWebSearchMode = "full" | "model-only";

type PerplexitySearchProfile = {
  maxResults: number;
  searchRecencyFilter: "month" | "year";
  searchLanguageFilter: AppearanceLocale[];
};

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
 * for the enrichment **secondary** (fallback) model. BYOK for xAI remains `AI_ENRICHMENT_XAI_API_KEY`.
 */
export function resolveEnrichmentGrokGatewayModelId(): GatewayModelId {
  const raw = process.env.AI_ENRICHMENT_GROK_MODEL?.trim();
  if (!raw) {
    return COMPANY_ENRICHMENT_FALLBACK_MODEL;
  }
  return raw as GatewayModelId;
}

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

/** Structuring models + Perplexity limits. `primary` / `secondary` apply only to phase 2 (JSON); phase 1 uses `ENRICHMENT_RESEARCH_GATEWAY_MODEL`. */
async function loadEnrichmentRuntimeConfig(): Promise<{
  primary: GatewayModelId;
  secondary: GatewayModelId;
  perplexityMaxResults: number;
  promptTight: boolean;
  digestMaxChars: number;
  crmSearchLocale: AppearanceLocale;
  perplexityFastMaxResults: number;
  perplexityFastRecency: "month" | "year";
}> {
  const fallbackLocale: AppearanceLocale = "de";
  const fallbackFastMax = 2;
  const fallbackFastRecency: "month" | "year" = "year";
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
        crmSearchLocale: fallbackLocale,
        perplexityFastMaxResults: fallbackFastMax,
        perplexityFastRecency: fallbackFastRecency,
      };
    }
    const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
    return {
      primary: policy.primaryGatewayModelId,
      secondary: resolveEnrichmentGrokGatewayModelId(),
      perplexityMaxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
      promptTight: false,
      digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS,
      crmSearchLocale: policy.crmSearchLocale,
      perplexityFastMaxResults: policy.perplexityFastMaxResults,
      perplexityFastRecency: policy.perplexityFastRecency,
    };
  } catch {
    return {
      primary: COMPANY_ENRICHMENT_PRIMARY_MODEL,
      secondary: resolveEnrichmentGrokGatewayModelId(),
      perplexityMaxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
      promptTight: false,
      digestMaxChars: ENRICHMENT_DIGEST_MAX_CHARS,
      crmSearchLocale: fallbackLocale,
      perplexityFastMaxResults: fallbackFastMax,
      perplexityFastRecency: fallbackFastRecency,
    };
  }
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

export function createCompanyEnrichmentPerplexityTool(gateway: GatewayInstance, profile: PerplexitySearchProfile) {
  const capped = Math.max(1, Math.min(8, Math.floor(profile.maxResults)));
  return gateway.tools.perplexitySearch({
    maxResults: capped,
    searchLanguageFilter: [...profile.searchLanguageFilter],
    searchRecencyFilter: profile.searchRecencyFilter,
  });
}

function shouldRetryWithFallback(error: unknown): boolean {
  if (GatewayError.isInstance(error)) return true;
  if (error instanceof Error) {
    return /429|503|timeout|ETIMEDOUT|ECONNRESET|rate/i.test(error.message);
  }
  return false;
}

async function runCompanyEnrichmentModelOnlyGeneration(params: {
  gateway: GatewayInstance;
  system: string;
  userPrompt: string;
  structuringPrimary: GatewayModelId;
  structuringSecondary: GatewayModelId;
}): Promise<{ result: CompanyEnrichmentResult; modelUsed: GatewayModelId }> {
  const providerOptions = getEnrichmentGatewayProviderOptions();
  const output = Output.object({
    name: "CompanyEnrichment",
    description: "Nur Modellwissen (ohne Web): strukturierte Vorschläge für CRM-Felder.",
    schema: companyEnrichmentAiSchema,
  });

  const runOnce = async (structureModelId: GatewayModelId) => {
    console.time("Model-Only Phase");
    try {
      const structureOut = await generateText({
        model: params.gateway(structureModelId),
        system: params.system,
        prompt: params.userPrompt,
        output,
        stopWhen: stepCountIs(4),
        ...(providerOptions ? { providerOptions } : {}),
      });
      if (!structureOut.output) {
        throw new Error("ENRICHMENT_NO_OUTPUT");
      }
      return sanitizeEnrichmentOutput(structureOut.output as CompanyEnrichmentAiOutput);
    } finally {
      console.timeEnd("Model-Only Phase");
    }
  };

  try {
    const result = await runOnce(params.structuringPrimary);
    return { result, modelUsed: params.structuringPrimary };
  } catch (first) {
    if (!shouldRetryWithFallback(first) || params.structuringSecondary === params.structuringPrimary) {
      throw first;
    }
    const result = await runOnce(params.structuringSecondary);
    return { result, modelUsed: params.structuringSecondary };
  }
}

export async function runCompanyEnrichmentGeneration(params: {
  system: string;
  userPrompt: string;
  addressFocusPrioritize?: boolean;
  /** Omit = `"full"` (bulk). Modal: `"model-only"` default or `"full"` for Perplexity + policy structuring. */
  webSearchMode?: CompanyEnrichmentWebSearchMode;
  /** Optional per-run override of structuring primary/secondary (validated by caller); `full` path only. */
  gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId };
}): Promise<{ result: CompanyEnrichmentResult; modelUsed: GatewayModelId }> {
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI_GATEWAY_MISSING");
  }

  const runtime = await loadEnrichmentRuntimeConfig();
  const webSearchMode: CompanyEnrichmentWebSearchMode = params.webSearchMode ?? "full";
  const isModelOnly = webSearchMode === "model-only";

  if (isModelOnly) {
    // Address-focus policy applies only to Full web search; model-only stays conservative (no extra system hints).
    const systemModelOnly = params.system;
    const structuringPrimary = params.gatewayModelOverride?.primary ?? runtime.primary;
    const structuringSecondary = params.gatewayModelOverride?.secondary ?? runtime.secondary;
    return runCompanyEnrichmentModelOnlyGeneration({
      gateway,
      system: systemModelOnly,
      userPrompt: params.userPrompt,
      structuringPrimary,
      structuringSecondary,
    });
  }

  const effectivePromptTight = runtime.promptTight;
  const effectiveDigestMaxChars = runtime.digestMaxChars;
  const langFilter: AppearanceLocale[] = [runtime.crmSearchLocale];
  const perplexityProfile: PerplexitySearchProfile = {
    maxResults: runtime.perplexityFastMaxResults,
    searchRecencyFilter: runtime.perplexityFastRecency,
    searchLanguageFilter: langFilter,
  };

  const addressFocus = params.addressFocusPrioritize === true;
  const systemPrefix = effectivePromptTight
    ? "Öffentliche Fakten nur aus Recherche-Ergebnissen; Antwort knapp halten bei gleicher JSON-Qualität und Schema-Treue.\n\n"
    : "";
  const system = addressFocus
    ? `${systemPrefix}${params.system}\n\n${buildCompanyEnrichmentAddressFocusInstructions({ compact: effectivePromptTight })}`
    : `${systemPrefix}${params.system}`;
  const companyContactHint =
    "\n\nZusatz (website, email): Nur aus belastbaren Primärquellen (Impressum, offizielle Firmen-Domain, verifizierbare Brancheneinträge). " +
    "website: kanonische URL exakt wie in der Quelle (https nur wenn dort genannt); keine erfundenen Hosts. " +
    "email: nur bei eindeutig korrekter Schreibweise (user@domain); sonst null.";
  const closedEnumHint = buildCompanyEnrichmentClosedEnumPromptBlock();

  const userPrompt = addressFocus
    ? effectivePromptTight
      ? `${params.userPrompt}${companyContactHint}${closedEnumHint}\n\nZusatz: Adress-/Gewässerfelder nur aus Quellen; sonst null.`
      : `${params.userPrompt}${companyContactHint}${closedEnumHint}\n\nZusatz: Bitte Adress- und Gewässernähe-Felder (strasse, plz, stadt, bundesland, land, wasserdistanz, wassertyp) besonders sorgfältig prüfen und nur bei belastbaren Quellen befüllen.`
    : `${params.userPrompt}${companyContactHint}${closedEnumHint}`;

  const tools = {
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway, perplexityProfile),
  };

  const output = Output.object({
    name: "CompanyEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für CRM-Felder.",
    schema: companyEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();

  const structuringPrimary = params.gatewayModelOverride?.primary ?? runtime.primary;
  const structuringSecondary = params.gatewayModelOverride?.secondary ?? runtime.secondary;

  const runWithStructuringModel = async (structureModelId: GatewayModelId) => {
    // Phase 1: provider-executed Perplexity tool — AI SDK only parses `output` when the last
    // step finishReason is "stop"; tool-only final steps throw AI_NoOutputGeneratedError.
    const researchResult = await (async () => {
      console.time("Perplexity Phase");
      try {
        return await generateText({
          model: gateway(ENRICHMENT_RESEARCH_GATEWAY_MODEL),
          tools,
          toolChoice: "auto",
          stopWhen: stepCountIs(12),
          system,
          prompt: userPrompt,
          ...(providerOptions ? { providerOptions } : {}),
        });
      } finally {
        console.timeEnd("Perplexity Phase");
      }
    })();

    const digest = buildEnrichmentResearchDigest(researchResult, effectiveDigestMaxChars);
    const structurePrompt = buildEnrichmentStructurePrompt(digest, effectivePromptTight);

    const raw = await (async () => {
      console.time("Structuring Phase");
      try {
        const structureOut = await generateText({
          model: gateway(structureModelId),
          system,
          prompt: structurePrompt,
          output,
          stopWhen: stepCountIs(4),
          ...(providerOptions ? { providerOptions } : {}),
        });
        return structureOut.output;
      } finally {
        console.timeEnd("Structuring Phase");
      }
    })();
    if (!raw) {
      throw new Error("ENRICHMENT_NO_OUTPUT");
    }
    return sanitizeEnrichmentOutput(raw as CompanyEnrichmentAiOutput);
  };

  try {
    const result = await runWithStructuringModel(structuringPrimary);
    return { result, modelUsed: structuringPrimary };
  } catch (first) {
    if (!shouldRetryWithFallback(first) || structuringSecondary === structuringPrimary) {
      throw first;
    }
    const result = await runWithStructuringModel(structuringSecondary);
    return { result, modelUsed: structuringSecondary };
  }
}

export async function runContactEnrichmentGeneration(params: {
  system: string;
  userPrompt: string;
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
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway, {
      maxResults: PERPLEXITY_MAX_RESULTS_DEFAULT,
      searchRecencyFilter: "month",
      searchLanguageFilter: [runtime.crmSearchLocale],
    }),
  };

  const output = Output.object({
    name: "ContactEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für Kontaktfelder.",
    schema: contactEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();

  const structuringPrimary = params.gatewayModelOverride?.primary ?? runtime.primary;
  const structuringSecondary = params.gatewayModelOverride?.secondary ?? runtime.secondary;

  const runWithStructuringModel = async (structureModelId: GatewayModelId) => {
    // Latency: console.time pairs = Perplexity research vs JSON structuring (same labels pattern as company).
    const researchResult = await (async () => {
      console.time("Perplexity Phase");
      try {
        return await generateText({
          model: gateway(ENRICHMENT_RESEARCH_GATEWAY_MODEL),
          tools,
          toolChoice: "auto",
          stopWhen: stepCountIs(12),
          system: systemEffective,
          prompt: params.userPrompt,
          ...(providerOptions ? { providerOptions } : {}),
        });
      } finally {
        console.timeEnd("Perplexity Phase");
      }
    })();

    const digest = buildEnrichmentResearchDigest(researchResult, runtime.digestMaxChars);
    const structurePrompt = buildEnrichmentStructurePrompt(digest, runtime.promptTight);

    const raw = await (async () => {
      console.time("Structuring Phase");
      try {
        const structureOut = await generateText({
          model: gateway(structureModelId),
          system: systemEffective,
          prompt: structurePrompt,
          output,
          stopWhen: stepCountIs(4),
          ...(providerOptions ? { providerOptions } : {}),
        });
        return structureOut.output;
      } finally {
        console.timeEnd("Structuring Phase");
      }
    })();
    if (!raw) {
      throw new Error("ENRICHMENT_NO_OUTPUT");
    }
    return sanitizeContactEnrichmentOutput(raw as ContactEnrichmentAiOutput);
  };

  try {
    const result = await runWithStructuringModel(structuringPrimary);
    return { result, modelUsed: structuringPrimary };
  } catch (first) {
    if (!shouldRetryWithFallback(first) || structuringSecondary === structuringPrimary) {
      throw first;
    }
    const result = await runWithStructuringModel(structuringSecondary);
    return { result, modelUsed: structuringSecondary };
  }
}
