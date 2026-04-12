// Shared gateway error mapping for company + contact enrichment (not a Server Actions module).

import { GatewayError, GatewayRateLimitError } from "@ai-sdk/gateway";

import type { EnrichmentGatewayFailureDiagnostic } from "@/lib/ai/enrichment-gateway-failure-types";

const GATEWAY_MESSAGE_MAX_CHARS = 500;

/** Strip gateway model ids so `xai/grok-…` in errors does not imply xAI-account quota. */
function normalizeQuotaDiagnosticText(raw: string): string {
  const withoutModelSlugs = raw.replace(
    /\b(?:anthropic|openai|google|xai)\/[a-z0-9][a-z0-9._-]*\b/gi,
    " ",
  );
  return withoutModelSlugs.replace(/\s+/g, " ").trim();
}

function isLikelyVercelAiGatewayAccountBillingBlock(lower: string): boolean {
  return (
    /\bvercel\b/.test(lower) ||
    /\bai gateway\b/.test(lower) ||
    /gateway (credit|billing|balance)/.test(lower) ||
    /spend limit/.test(lower) ||
    /insufficient (ai )?credits?/.test(lower) ||
    /no (ai )?credits?/.test(lower) ||
    /credit balance/.test(lower) ||
    /purchase credits?/.test(lower) ||
    /included usage/.test(lower) ||
    /\bpayment required\b/.test(lower)
  );
}

function isLikelyXaiUpstreamQuotaOrBilling(lower: string): boolean {
  if (isLikelyVercelAiGatewayAccountBillingBlock(lower)) {
    return false;
  }
  return (
    /api\.x\.ai/.test(lower) ||
    /\bx\.ai\/(v1|api)\b/.test(lower) ||
    /consumer[_\s-]*quota/.test(lower) ||
    /from provider.*\bxai\b/.test(lower) ||
    /upstream.*\bxai\b/.test(lower) ||
    /\bxai[_\s-](api|account|billing|error)\b/.test(lower)
  );
}

/** Classify payment / quota style failures: Vercel AI Gateway account vs upstream xAI (BYOK). */
function mapProviderQuotaExhaustionCode(statusCode: number | undefined, diagnosticText: string): string {
  const normalized = normalizeQuotaDiagnosticText(diagnosticText).toLowerCase();

  if (statusCode === 402) {
    if (isLikelyXaiUpstreamQuotaOrBilling(normalized)) {
      return "XAI_GROK_QUOTA_EXHAUSTED";
    }
    return "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED";
  }

  if (isLikelyVercelAiGatewayAccountBillingBlock(normalized)) {
    return "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED";
  }
  if (isLikelyXaiUpstreamQuotaOrBilling(normalized)) {
    return "XAI_GROK_QUOTA_EXHAUSTED";
  }

  return "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED";
}

function inferHttpStatusFromMessage(msg: string): number | undefined {
  const m = msg.match(/\b(402|401|403|429)\b/);
  if (!m?.[1]) {
    return undefined;
  }
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractTokenUsageHint(message: string): string | undefined {
  const tokenPair =
    /(?:prompt|completion|total|input|output|cached)[_\s]tokens?\s*[:=]\s*\d+(?:\s*[,;]\s*(?:prompt|completion|total|input|output|cached)[_\s]tokens?\s*[:=]\s*\d+){0,8}/i.exec(
      message,
    );
  if (tokenPair) {
    return tokenPair[0].slice(0, 300);
  }
  const jsonish =
    /\{[\s\S]{0,500}"(?:prompt_tokens|total_tokens|completion_tokens|input_tokens|output_tokens)"[\s\S]{0,500}\}/.exec(
      message,
    );
  if (jsonish) {
    return jsonish[0].slice(0, 300);
  }
  return undefined;
}

export function buildAiEnrichmentFailureDiagnostic(
  err: unknown,
  stableCode: string,
): EnrichmentGatewayFailureDiagnostic {
  if (GatewayError.isInstance(err)) {
    const rawMsg = err.message;
    return {
      stableCode,
      httpStatus: err.statusCode,
      gatewayMessage: rawMsg.slice(0, GATEWAY_MESSAGE_MAX_CHARS),
      generationId: err.generationId,
      tokenUsageHint: tryExtractTokenUsageHint(rawMsg),
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return {
    stableCode,
    gatewayMessage: msg.slice(0, GATEWAY_MESSAGE_MAX_CHARS),
    tokenUsageHint: tryExtractTokenUsageHint(msg),
  };
}

/** Maps gateway / model failures to stable action error codes (shared by company + contact enrichment). */
export function mapAiEnrichmentGatewayPipelineError(err: unknown): string {
  if (err instanceof Error && err.message === "AI_GATEWAY_MISSING") {
    return "AI_GATEWAY_MISSING";
  }
  if (err instanceof Error && err.message === "ENRICHMENT_NO_OUTPUT") {
    return "ENRICHMENT_NO_OUTPUT";
  }

  if (GatewayError.isInstance(err)) {
    if (GatewayRateLimitError.isInstance(err)) {
      return "AI_GATEWAY_RATE_LIMIT";
    }
    const statusCode = err.statusCode;
    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return "AI_GATEWAY_UNAVAILABLE";
    }
    const combined = `${err.statusCode} ${err.message}`;
    const combinedLower = combined.toLowerCase();
    const creditsLikely =
      err.statusCode === 402 ||
      /insufficient|credit|billing|quota|balance|payment required|spend limit|exceeded your|not enough/.test(
        combinedLower,
      );

    if (creditsLikely) {
      return mapProviderQuotaExhaustionCode(statusCode, combined);
    }
  }

  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (/402|payment required|insufficient funds|credit limit|billing/.test(lower)) {
    return mapProviderQuotaExhaustionCode(inferHttpStatusFromMessage(msg), lower);
  }

  if (
    /econnreset|etimedout|enotfound|network|fetch failed|socket hang up|eai_again|econnrefused/.test(lower)
  ) {
    return "AI_GATEWAY_UNAVAILABLE";
  }

  return "ENRICHMENT_FAILED";
}
