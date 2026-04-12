// Types only — keep separate from enrichment-gateway-pipeline.ts so `"use server"` importers
// do not pull a module that Turbopack may treat as exporting a runtime `AiEnrichmentFailureDiagnostic` binding.

/** Structured gateway failure info for client debug UI (bounded, no stacks). */
export type EnrichmentGatewayFailureDiagnostic = {
  stableCode: string;
  httpStatus?: number;
  gatewayMessage: string;
  generationId?: string;
  tokenUsageHint?: string;
};
