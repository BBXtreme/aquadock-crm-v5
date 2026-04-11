// Server-side Vercel AI Gateway wiring for company enrichment (Claude Sonnet 4.6 primary, Grok 4.1 fallback).
// Optional xAI BYOK: set AI_ENRICHMENT_XAI_API_KEY so Grok calls bill your xAI subscription via AI Gateway.

import type { GatewayModelId } from "@ai-sdk/gateway";
import { GatewayError } from "@ai-sdk/gateway";
import { createGateway, generateText, Output, stepCountIs } from "ai";

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

type ResearchStepLike = {
  text?: string;
  toolResults?: unknown;
};

/** Collapses Perplexity + model text from phase 1 for the structuring prompt. */
function buildEnrichmentResearchDigest(researchResult: {
  text: string;
  steps: readonly ResearchStepLike[];
}): string {
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
  if (body.length <= ENRICHMENT_DIGEST_MAX_CHARS) {
    return body;
  }
  return `${body.slice(0, ENRICHMENT_DIGEST_MAX_CHARS)}\n\n[… Digest gekürzt …]`;
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
export function buildCompanyEnrichmentAddressFocusInstructions(): string {
  return `Adress- und Lage-Fokus: Priorisiere verlässliche, quellenbasierte Angaben zu Straße, PLZ, Ort, Bundesland und Land. Prüfe Wasserdistanz und Wassertyp nur bei belastbaren öffentlichen Hinweisen (Karten, Hafeninfos, Presse). Erfinde keine Koordinaten oder Postadressen.`;
}

type GatewayInstance = NonNullable<ReturnType<typeof createGateway>>;

function getGateway(): GatewayInstance | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) return null;
  return createGateway({ apiKey });
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

export function createCompanyEnrichmentPerplexityTool(gateway: GatewayInstance) {
  return gateway.tools.perplexitySearch({
    maxResults: 5,
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
}): Promise<{ result: CompanyEnrichmentResult; modelUsed: GatewayModelId }> {
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI_GATEWAY_MISSING");
  }

  const addressFocus = params.addressFocusPrioritize === true;
  const system = addressFocus
    ? `${params.system}\n\n${buildCompanyEnrichmentAddressFocusInstructions()}`
    : params.system;
  const userPrompt = addressFocus
    ? `${params.userPrompt}\n\nZusatz: Bitte Adress- und Gewässernähe-Felder (strasse, plz, stadt, bundesland, land, wasserdistanz, wassertyp) besonders sorgfältig prüfen und nur bei belastbaren Quellen befüllen.`
    : params.userPrompt;

  const tools = {
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway),
  };

  const output = Output.object({
    name: "CompanyEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für CRM-Felder.",
    schema: companyEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();
  const mode = params.modelMode ?? "auto";

  const grokModelId = resolveEnrichmentGrokGatewayModelId();

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

    const digest = buildEnrichmentResearchDigest(researchResult);

    const structurePrompt = `Die Web-Recherche (perplexity_search) ist abgeschlossen. Nutze NUR die folgenden Roh-Ergebnisse. Erzeuge KEINE weiteren Tool-Aufrufe. Erzeuge jetzt das strukturierte JSON-Objekt gemäß dem vorgegebenen Schema (deutsche Texte; gültige URLs in Quellen nur aus den Ergebnissen).

=== RECHERCHE ===
${digest}`;

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
    const result = await runWithModel(grokModelId);
    return { result, modelUsed: grokModelId };
  }

  if (mode === "claude_only") {
    const result = await runWithModel(COMPANY_ENRICHMENT_PRIMARY_MODEL);
    return { result, modelUsed: COMPANY_ENRICHMENT_PRIMARY_MODEL };
  }

  try {
    const result = await runWithModel(COMPANY_ENRICHMENT_PRIMARY_MODEL);
    return { result, modelUsed: COMPANY_ENRICHMENT_PRIMARY_MODEL };
  } catch (first) {
    if (!shouldRetryWithFallback(first)) {
      throw first;
    }
    const result = await runWithModel(grokModelId);
    return { result, modelUsed: grokModelId };
  }
}

export async function runContactEnrichmentGeneration(params: {
  system: string;
  userPrompt: string;
  modelMode?: EnrichmentModelMode;
}): Promise<{ result: ContactEnrichmentResult; modelUsed: GatewayModelId }> {
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI_GATEWAY_MISSING");
  }

  const tools = {
    perplexity_search: createCompanyEnrichmentPerplexityTool(gateway),
  };

  const output = Output.object({
    name: "ContactEnrichment",
    description: "Öffentliche Web-Recherche: strukturierte Vorschläge für Kontaktfelder.",
    schema: contactEnrichmentAiSchema,
  });

  const providerOptions = getEnrichmentGatewayProviderOptions();
  const mode = params.modelMode ?? "auto";
  const grokModelId = resolveEnrichmentGrokGatewayModelId();

  const runWithModel = async (modelId: GatewayModelId) => {
    const researchResult = await generateText({
      model: gateway(modelId),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(12),
      system: params.system,
      prompt: params.userPrompt,
      ...(providerOptions ? { providerOptions } : {}),
    });

    const digest = buildEnrichmentResearchDigest(researchResult);

    const structurePrompt = `Die Web-Recherche (perplexity_search) ist abgeschlossen. Nutze NUR die folgenden Roh-Ergebnisse. Erzeuge KEINE weiteren Tool-Aufrufe. Erzeuge jetzt das strukturierte JSON-Objekt gemäß dem vorgegebenen Schema (deutsche Texte; gültige URLs in Quellen nur aus den Ergebnissen).

=== RECHERCHE ===
${digest}`;

    const { output: raw } = await generateText({
      model: gateway(modelId),
      system: params.system,
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
    const result = await runWithModel(grokModelId);
    return { result, modelUsed: grokModelId };
  }

  if (mode === "claude_only") {
    const result = await runWithModel(COMPANY_ENRICHMENT_PRIMARY_MODEL);
    return { result, modelUsed: COMPANY_ENRICHMENT_PRIMARY_MODEL };
  }

  try {
    const result = await runWithModel(COMPANY_ENRICHMENT_PRIMARY_MODEL);
    return { result, modelUsed: COMPANY_ENRICHMENT_PRIMARY_MODEL };
  } catch (first) {
    if (!shouldRetryWithFallback(first)) {
      throw first;
    }
    const result = await runWithModel(grokModelId);
    return { result, modelUsed: grokModelId };
  }
}
