import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_SEARCH_EMBEDDING_DIMENSION = 1536 as const;
export const COMPANY_SEARCH_EMBEDDING_MODEL = "grok-embedding-small" as const;
const XAI_EMBEDDINGS_ENDPOINT = "https://api.x.ai/v1/embeddings";
const XAI_EMBEDDINGS_TIMEOUT_MS = 12_000;

type SemanticNullableText = string | null | undefined;

export type CompanySemanticDocumentInput = {
  firmenname: string;
  kundentyp?: SemanticNullableText;
  firmentyp?: SemanticNullableText;
  rechtsform?: SemanticNullableText;
  strasse?: SemanticNullableText;
  plz?: SemanticNullableText;
  stadt?: SemanticNullableText;
  bundesland?: SemanticNullableText;
  land?: SemanticNullableText;
  notes?: SemanticNullableText;
  status?: SemanticNullableText;
  wassertyp?: SemanticNullableText;
  website?: SemanticNullableText;
  email?: SemanticNullableText;
  telefon?: SemanticNullableText;
};

export type HybridCompanySearchParams = {
  query: string;
  queryEmbedding: readonly number[];
  matchCount?: number;
  rrfK?: number;
  ftsWeight?: number;
  vectorWeight?: number;
};

export type HybridCompanySearchResultRow = {
  companyId: string;
  rrfScore: number;
  ftsRank: number | null;
  vectorRank: number | null;
};

type HybridCompanySearchRpcRow = {
  company_id: unknown;
  rrf_score: unknown;
  fts_rank: unknown;
  vector_rank: unknown;
};

type XaiEmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>;
};

function normalizeText(value: SemanticNullableText): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function asPositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const n = Math.floor(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asNonNegativeNumber(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseEmbedding(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    throw new Error("xAI embedding response did not return an embedding array.");
  }
  const parsed = raw
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null);
  if (parsed.length !== COMPANY_SEARCH_EMBEDDING_DIMENSION) {
    throw new Error(
      `xAI embedding dimension mismatch: expected ${String(COMPANY_SEARCH_EMBEDDING_DIMENSION)}, got ${String(parsed.length)}.`,
    );
  }
  return parsed;
}

function toPgVectorLiteral(vector: readonly number[]): string {
  if (vector.length !== COMPANY_SEARCH_EMBEDDING_DIMENSION) {
    throw new Error(
      `Invalid embedding dimension: expected ${String(COMPANY_SEARCH_EMBEDDING_DIMENSION)}, got ${String(vector.length)}.`,
    );
  }
  const values = vector.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contains non-finite numeric values.");
    }
    return String(value);
  });
  return `[${values.join(",")}]`;
}

function ensureApiKey(): string {
  const key = process.env.XAI_API_KEY?.trim() ?? process.env.XAI_EMBEDDING_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing xAI API key. Set XAI_API_KEY (or XAI_EMBEDDING_API_KEY).");
  }
  return key;
}

export function buildCompanySemanticDocument(input: CompanySemanticDocumentInput): string {
  const chunks: string[] = [];
  const push = (label: string, value: SemanticNullableText) => {
    const normalized = normalizeText(value);
    if (normalized !== null) {
      chunks.push(`${label}: ${normalized}`);
    }
  };

  push("Company", input.firmenname);
  push("CustomerType", input.kundentyp);
  push("CompanyType", input.firmentyp);
  push("LegalForm", input.rechtsform);
  push("Street", input.strasse);
  push("PostalCode", input.plz);
  push("City", input.stadt);
  push("State", input.bundesland);
  push("Country", input.land);
  push("Status", input.status);
  push("WaterType", input.wassertyp);
  push("Website", input.website);
  push("Email", input.email);
  push("Phone", input.telefon);
  push("Notes", input.notes);

  return chunks.join("\n");
}

export async function createXaiEmbedding(input: {
  text: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<number[]> {
  const text = input.text.trim();
  if (text.length === 0) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const apiKey = ensureApiKey();
  const endpoint = process.env.XAI_EMBEDDINGS_URL?.trim() || XAI_EMBEDDINGS_ENDPOINT;
  const model = input.model?.trim() || COMPANY_SEARCH_EMBEDDING_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, XAI_EMBEDDINGS_TIMEOUT_MS);
  const onAbort = () => {
    controller.abort();
  };
  input.signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`xAI embeddings request failed (${String(response.status)}): ${bodyText}`);
    }

    const payload = (await response.json()) as XaiEmbeddingResponse;
    const first = payload.data?.[0];
    if (!first || first.embedding === undefined) {
      throw new Error("xAI embedding response is missing data[0].embedding.");
    }
    return parseEmbedding(first.embedding);
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", onAbort);
  }
}

export async function hybridCompanySearch(
  supabase: SupabaseClient,
  params: HybridCompanySearchParams,
): Promise<HybridCompanySearchResultRow[]> {
  const query = params.query.trim();
  if (query.length === 0) {
    return [];
  }
  if (
    !params.queryEmbedding ||
    params.queryEmbedding.length !== COMPANY_SEARCH_EMBEDDING_DIMENSION
  ) {
    throw new Error("Invalid query embedding passed to hybridCompanySearch");
  }

  const matchCount = asPositiveInteger(params.matchCount, 200);
  const rrfK = asPositiveInteger(params.rrfK, 60);
  const ftsWeight = asNonNegativeNumber(params.ftsWeight, 1);
  const vectorWeight = asNonNegativeNumber(params.vectorWeight, 1);
  const queryEmbedding = toPgVectorLiteral(params.queryEmbedding);

  const { data, error } = await supabase.rpc("hybrid_company_search", {
    p_query: query,
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
    p_rrf_k: rrfK,
    p_fts_weight: ftsWeight,
    p_vector_weight: vectorWeight,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as HybridCompanySearchRpcRow[];
  return rows
    .map((row): HybridCompanySearchResultRow | null => {
      if (typeof row.company_id !== "string") {
        return null;
      }
      const rrfScore = toFiniteNumber(row.rrf_score);
      if (rrfScore === null) {
        return null;
      }
      const ftsRank = row.fts_rank === null ? null : toFiniteNumber(row.fts_rank);
      const vectorRank = row.vector_rank === null ? null : toFiniteNumber(row.vector_rank);
      return {
        companyId: row.company_id,
        rrfScore,
        ftsRank: ftsRank === null ? null : Math.floor(ftsRank),
        vectorRank: vectorRank === null ? null : Math.floor(vectorRank),
      };
    })
    .filter((row): row is HybridCompanySearchResultRow => row !== null);
}

export async function generateAndStoreCompanyEmbedding(
  supabase: SupabaseClient,
  companyId: string,
  input: CompanySemanticDocumentInput,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const text = buildCompanySemanticDocument(input);
    if (text.length < 10) {
      return;
    }

    const embedding = await createXaiEmbedding({ text, signal });
    const pgVector = toPgVectorLiteral(embedding);

    const { error } = await supabase
      .from("companies")
      .update({ search_embedding: pgVector })
      .eq("id", companyId);

    if (error) {
      console.warn(`Failed to store embedding for company ${companyId}:`, error.message);
    }
  } catch (err) {
    console.warn(`Embedding generation failed for company ${companyId}:`, err);
  }
}
