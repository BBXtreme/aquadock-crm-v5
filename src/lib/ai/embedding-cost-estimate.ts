import type { EmbeddingProvider } from "@/lib/services/semantic-search";

/**
 * Cost estimate for (re-)embedding companies.
 *
 * Pricing basis (May 2026, rounded):
 * - xAI `grok-embedding-small`: ~0.00015 € / company embedding
 * - OpenAI `text-embedding-3-small`: ~0.00004 € / company embedding
 * - OpenAI `text-embedding-3-large`: ~0.00012 € / company embedding
 *
 * Notes:
 * - This is a UX estimate, not a billing guarantee (token length varies).
 * - For Gateway providers, we assume the selected embedding model determines the effective price tier.
 */
export function estimateReEmbedCost(
  userCompanyCount: number,
  provider: EmbeddingProvider,
  model: string,
): string {
  const count = Number.isFinite(userCompanyCount) ? Math.max(0, Math.floor(userCompanyCount)) : 0;

  const perCompanyEuro = resolvePerCompanyEuro(provider, model);
  const raw = count * perCompanyEuro;

  if (raw < 0.05) {
    return "unter 0,05 €";
  }

  const rounded = Math.round(raw * 100) / 100;
  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  return `ca. ${formatted}`;
}

function resolvePerCompanyEuro(provider: EmbeddingProvider, model: string): number {
  if (provider === "xai") {
    return 0.00015;
  }

  if (model === "text-embedding-3-large") {
    return 0.00012;
  }
  if (model === "text-embedding-3-small") {
    return 0.00004;
  }
  if (model === "grok-embedding-small") {
    return 0.00015;
  }

  // Safe-ish default: small OpenAI tier.
  return 0.00004;
}

