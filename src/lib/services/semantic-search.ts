import { createGateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";

export const COMPANY_SEARCH_EMBEDDING_DIMENSION = 1536 as const;
export const COMPANY_SEARCH_EMBEDDING_MODEL = "text-embedding-3-small" as const;
const EMBEDDINGS_TIMEOUT_MS = 12_000;
const XAI_EMBEDDING_MODEL = "grok-embedding-small" as const;

export const DEFAULT_SEMANTIC_SETTINGS = {
  embeddingProvider: "gateway",
  embeddingModel: "text-embedding-3-small",
  semanticSearchEnabled: true,
  autoBackfillEmbeddings: true,
  showSemanticBadge: true,
} as const;

type SemanticNullableText = string | null | undefined;
type EmbeddingProvider = "gateway" | "openai" | "xai";
type UserSettingsRow = { key: string; value: unknown };
type EmbeddingAttempt =
  | { kind: "openai-direct"; model: ReturnType<typeof openai.textEmbedding>; modelId: string }
  | {
      kind: "gateway-openai" | "gateway-xai";
      model: ReturnType<NonNullable<ReturnType<typeof createGateway>>["embeddingModel"]>;
      modelId: string;
    };

export type SemanticSearchSettings = {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  semanticSearchEnabled: boolean;
  autoBackfillEmbeddings: boolean;
  showSemanticBadge: boolean;
};

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
  /**
   * Cosine distance upper bound for vector candidates (pgvector `<=>`, range 0..2).
   * Rows beyond this are excluded entirely — without it, `hybrid_company_search`
   * pads the result set with the "least bad" nearest neighbours, making random
   * queries look like they "find something". Defaults to the RPC default
   * (0.5): admits on-topic conceptual German queries while rejecting
   * off-topic and cross-language noise. FTS matches are always kept regardless.
   */
  maxVectorDistance?: number;
};

export type HybridCompanySearchResultRow = {
  companyId: string;
  rrfScore: number;
  ftsRank: number | null;
  vectorRank: number | null;
};

export type EmbeddingConnectionTestResult = {
  ok: boolean;
  reason: "connected" | "disabled" | "not_configured" | "failed";
};

type HybridCompanySearchRpcRow = {
  company_id: unknown;
  rrf_score: unknown;
  fts_rank: unknown;
  vector_rank: unknown;
};

function emitDebugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "cc0d67",
    },
    body: JSON.stringify({
      sessionId: "cc0d67",
      runId: payload.runId,
      hypothesisId: payload.hypothesisId,
      location: payload.location,
      message: payload.message,
      data: payload.data ?? {},
      timestamp: Date.now(),
    }),
  }).catch(() => {
    // debug logging is best-effort
  });
  // #endregion
}

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
    throw new Error("Embedding response did not return an embedding array.");
  }
  const parsed = raw
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null);
  if (parsed.length !== COMPANY_SEARCH_EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${String(COMPANY_SEARCH_EMBEDDING_DIMENSION)}, got ${String(parsed.length)}.`,
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

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function normalizeEmbeddingProvider(value: unknown): EmbeddingProvider {
  if (typeof value !== "string") {
    return DEFAULT_SEMANTIC_SETTINGS.embeddingProvider;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "gateway" || normalized === "vercel") {
    return "gateway";
  }
  if (normalized === "openai") {
    return "openai";
  }
  if (normalized === "xai") {
    return "xai";
  }
  console.warn(
    `[semantic-search] Unsupported EMBEDDING_PROVIDER "${normalized}". Falling back to "${DEFAULT_SEMANTIC_SETTINGS.embeddingProvider}".`,
  );
  return DEFAULT_SEMANTIC_SETTINGS.embeddingProvider;
}

function normalizeEmbeddingModel(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function hasProviderCredentials(provider: EmbeddingProvider): boolean {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (provider === "gateway" || provider === "xai") return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
  return false;
}

function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return createGateway({ apiKey });
}

function isCredentialConfigurationError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const maybe = err as {
    statusCode?: unknown;
    data?: unknown;
    message?: unknown;
    cause?: unknown;
    responseBody?: unknown;
  };
  const message = typeof maybe.message === "string" ? maybe.message.toLowerCase() : "";
  if (message.includes("incorrect api key provided") || message.includes("api key is missing")) {
    return true;
  }
  if (maybe.statusCode === 401) {
    return true;
  }
  const dataError =
    maybe.data && typeof maybe.data === "object"
      ? (maybe.data as { error?: { code?: unknown; type?: unknown } }).error
      : undefined;
  if (dataError?.code === "invalid_api_key") {
    return true;
  }
  const causeObj =
    maybe.cause && typeof maybe.cause === "object"
      ? (maybe.cause as { statusCode?: unknown; message?: unknown; data?: unknown; code?: unknown })
      : undefined;
  if (causeObj?.statusCode === 401 || causeObj?.code === "invalid_api_key") {
    return true;
  }
  const causeMessage = typeof causeObj?.message === "string" ? causeObj.message.toLowerCase() : "";
  if (causeMessage.includes("incorrect api key provided") || causeMessage.includes("api key is missing")) {
    return true;
  }
  const responseBodyText = typeof maybe.responseBody === "string" ? maybe.responseBody.toLowerCase() : "";
  if (responseBodyText.includes("invalid_api_key") || responseBodyText.includes("incorrect api key provided")) {
    return true;
  }
  const causeDataError =
    causeObj?.data && typeof causeObj.data === "object"
      ? (causeObj.data as { error?: { code?: unknown; type?: unknown } }).error
      : undefined;
  if (causeDataError?.code === "invalid_api_key") {
    return true;
  }
  if (dataError?.type === "invalid_request_error") {
    if (message.includes("api key")) {
      return true;
    }
  }
  return false;
}

async function fetchCurrentUserSettings(
  supabase: SupabaseClient,
): Promise<UserSettingsRow[] | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }
    const { data, error } = await supabase
      .from("user_settings")
      .select("key, value")
      .eq("user_id", user.id)
      .in("key", [
        "embedding_provider",
        "embedding_model",
        "semantic_search_enabled",
        "auto_backfill_embeddings",
        "show_semantic_badge",
      ]);
    if (error) {
      return null;
    }
    return (data ?? []) as UserSettingsRow[];
  } catch {
    return null;
  }
}

export async function resolveSemanticSearchSettings(
  supabase?: SupabaseClient,
): Promise<SemanticSearchSettings> {
  const envProvider = normalizeEmbeddingProvider(process.env.EMBEDDING_PROVIDER);
  const envModel = normalizeEmbeddingModel(process.env.EMBEDDING_MODEL, DEFAULT_SEMANTIC_SETTINGS.embeddingModel);

  const defaults: SemanticSearchSettings = {
    embeddingProvider: envProvider,
    embeddingModel: envModel,
    semanticSearchEnabled: DEFAULT_SEMANTIC_SETTINGS.semanticSearchEnabled,
    autoBackfillEmbeddings: DEFAULT_SEMANTIC_SETTINGS.autoBackfillEmbeddings,
    showSemanticBadge: DEFAULT_SEMANTIC_SETTINGS.showSemanticBadge,
  };

  if (!supabase) {
    return defaults;
  }

  const rows = await fetchCurrentUserSettings(supabase);
  if (rows === null) {
    return defaults;
  }

  let embeddingProvider = defaults.embeddingProvider;
  let embeddingModel = defaults.embeddingModel;
  let semanticSearchEnabled = defaults.semanticSearchEnabled;
  let autoBackfillEmbeddings = defaults.autoBackfillEmbeddings;
  let showSemanticBadge = defaults.showSemanticBadge;

  for (const row of rows) {
    if (row.key === "embedding_provider") {
      embeddingProvider = normalizeEmbeddingProvider(row.value);
    }
    if (row.key === "embedding_model") {
      embeddingModel = normalizeEmbeddingModel(row.value, defaults.embeddingModel);
    }
    if (row.key === "semantic_search_enabled") {
      semanticSearchEnabled = parseBooleanSetting(row.value, defaults.semanticSearchEnabled);
    }
    if (row.key === "auto_backfill_embeddings") {
      autoBackfillEmbeddings = parseBooleanSetting(row.value, defaults.autoBackfillEmbeddings);
    }
    if (row.key === "show_semantic_badge") {
      showSemanticBadge = parseBooleanSetting(row.value, defaults.showSemanticBadge);
    }
  }

  return {
    embeddingProvider,
    embeddingModel,
    semanticSearchEnabled,
    autoBackfillEmbeddings,
    showSemanticBadge,
  };
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

function resolveOpenAIEmbeddingModel(modelId: string) {
  const model = normalizeEmbeddingModel(modelId, COMPANY_SEARCH_EMBEDDING_MODEL);
  if (model === "text-embedding-3-large") {
    return openai.textEmbedding("text-embedding-3-large");
  }
  if (model !== COMPANY_SEARCH_EMBEDDING_MODEL) {
    console.warn(
      `[semantic-search] Unsupported embedding model "${model}". Falling back to "${COMPANY_SEARCH_EMBEDDING_MODEL}".`,
    );
  }
  return openai.textEmbedding("text-embedding-3-small");
}

function buildSelectedProviderAttempt(settings: SemanticSearchSettings): EmbeddingAttempt {
  const model = normalizeEmbeddingModel(settings.embeddingModel, COMPANY_SEARCH_EMBEDDING_MODEL);
  if (settings.embeddingProvider === "openai") {
    return {
      kind: "openai-direct",
      model: resolveOpenAIEmbeddingModel(model),
      modelId: model,
    };
  }
  const gateway = getGateway();
  if (!gateway) {
    throw new Error("AI Gateway key is not configured.");
  }
  if (settings.embeddingProvider === "gateway") {
    return {
      kind: "gateway-openai",
      model: gateway.embeddingModel(`openai/${model}`),
      modelId: `openai/${model}`,
    };
  }
  const xaiModel = model === XAI_EMBEDDING_MODEL ? model : XAI_EMBEDDING_MODEL;
  return {
    kind: "gateway-xai",
    model: gateway.embeddingModel(`xai/${xaiModel}`),
    modelId: `xai/${xaiModel}`,
  };
}

export async function createCompanySearchEmbedding(
  input: {
    text: string;
    signal?: AbortSignal;
    supabase?: SupabaseClient;
  },
  settingsOverride?: SemanticSearchSettings,
): Promise<number[]> {
  const text = input.text.trim();
  // #region agent log
  emitDebugLog({
    runId: "pre-fix",
    hypothesisId: "H1",
    location: "semantic-search.ts:createCompanySearchEmbedding:entry",
    message: "Embedding call started",
    data: {
      textLength: text.length,
      hasSupabase: Boolean(input.supabase),
      hasSignal: Boolean(input.signal),
    },
  });
  // #endregion
  if (text.length === 0) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const settings = settingsOverride ?? (await resolveSemanticSearchSettings(input.supabase));
  // #region agent log
  emitDebugLog({
    runId: "pre-fix",
    hypothesisId: "H2",
    location: "semantic-search.ts:createCompanySearchEmbedding:settings",
    message: "Resolved embedding settings",
    data: {
      provider: settings.embeddingProvider,
      model: settings.embeddingModel,
      semanticSearchEnabled: settings.semanticSearchEnabled,
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      hasGatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    },
  });
  // #endregion
  if (!settings.semanticSearchEnabled) {
    // Skip embedding generation entirely when semantic search is turned off.
    throw new Error("Semantic search is disabled for this user.");
  }
  const hasCredentials = hasProviderCredentials(settings.embeddingProvider);
  if (!hasCredentials) {
    throw new Error(`Missing credentials for embedding provider "${settings.embeddingProvider}".`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMBEDDINGS_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onAbort);

  try {
    const attempt = buildSelectedProviderAttempt(settings);
    // #region agent log
    emitDebugLog({
      runId: "post-fix",
      hypothesisId: "H12",
      location: "semantic-search.ts:createCompanySearchEmbedding:selected-provider-attempt",
      message: "Calling selected provider only",
      data: {
        provider: settings.embeddingProvider,
        model: attempt.modelId,
      },
    });
    // #endregion
    const result = await embed({
      model: attempt.model,
      value: text,
      abortSignal: controller.signal,
    });
    // #region agent log
    emitDebugLog({
      runId: "post-fix",
      hypothesisId: "H12",
      location: "semantic-search.ts:createCompanySearchEmbedding:selected-provider-result",
      message: "Selected provider call completed",
      data: {
        provider: settings.embeddingProvider,
        embeddingLength: Array.isArray(result.embedding) ? result.embedding.length : -1,
      },
    });
    // #endregion
    return parseEmbedding(result.embedding);
  } catch (err) {
    const errMeta =
      typeof err === "object" && err !== null
        ? (err as { message?: unknown; statusCode?: unknown; cause?: unknown; data?: unknown })
        : undefined;
    // #region agent log
    emitDebugLog({
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "semantic-search.ts:createCompanySearchEmbedding:embed-error",
      message: "Embed call failed",
      data: {
        message: typeof errMeta?.message === "string" ? errMeta.message : String(err),
        statusCode: typeof errMeta?.statusCode === "number" ? errMeta.statusCode : null,
        hasCause: Boolean(errMeta?.cause),
        hasData: Boolean(errMeta?.data),
      },
    });
    // #endregion
    console.warn("[semantic-search] Embedding generation failed for selected provider. Falling back to lexical search.", err);
    throw err;
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", onAbort);
  }
}

export async function createXaiEmbedding(input: {
  text: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<number[]> {
  return await createCompanySearchEmbedding(
    {
      text: input.text,
      signal: input.signal,
    },
    {
      ...DEFAULT_SEMANTIC_SETTINGS,
      embeddingProvider: "xai",
      embeddingModel: input.model?.trim() || XAI_EMBEDDING_MODEL,
      semanticSearchEnabled: true,
      autoBackfillEmbeddings: true,
      showSemanticBadge: true,
    },
  );
}

export async function testEmbeddingConnection(
  settings: Pick<SemanticSearchSettings, "embeddingProvider" | "embeddingModel" | "semanticSearchEnabled">,
): Promise<EmbeddingConnectionTestResult> {
  // #region agent log
  emitDebugLog({
    runId: "pre-fix",
    hypothesisId: "H5",
    location: "semantic-search.ts:testEmbeddingConnection:start",
    message: "Connection test started",
    data: {
      provider: settings.embeddingProvider,
      model: settings.embeddingModel,
      semanticSearchEnabled: settings.semanticSearchEnabled,
    },
  });
  // #endregion
  if (!settings.semanticSearchEnabled) {
    return { ok: false, reason: "disabled" };
  }

  if (!hasProviderCredentials(settings.embeddingProvider)) {
    // #region agent log
    emitDebugLog({
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "semantic-search.ts:testEmbeddingConnection:not-configured",
      message: "No embedding credentials detected",
      data: {
        provider: settings.embeddingProvider,
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
        hasGatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
      },
    });
    // #endregion
    return { ok: false, reason: "not_configured" };
  }

  try {
    await createCompanySearchEmbedding(
      {
        text: "test connection",
      },
      {
        ...DEFAULT_SEMANTIC_SETTINGS,
        embeddingProvider: settings.embeddingProvider,
        embeddingModel: settings.embeddingModel,
        semanticSearchEnabled: settings.semanticSearchEnabled,
      },
    );
    // #region agent log
    emitDebugLog({
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "semantic-search.ts:testEmbeddingConnection:connected",
      message: "Connection test succeeded",
      data: {
        provider: settings.embeddingProvider,
      },
    });
    // #endregion
    return { ok: true, reason: "connected" };
  } catch (err) {
    // #region agent log
    emitDebugLog({
      runId: "post-fix",
      hypothesisId: "H6",
      location: "semantic-search.ts:testEmbeddingConnection:classification-eval",
      message: "Credential error classifier evaluated catch error",
      data: {
        isCredentialError: isCredentialConfigurationError(err),
        hasStatusCode: typeof (err as { statusCode?: unknown })?.statusCode === "number",
        hasCause: Boolean((err as { cause?: unknown })?.cause),
        hasData: Boolean((err as { data?: unknown })?.data),
        message: err instanceof Error ? err.message : String(err),
      },
    });
    // #endregion
    if (isCredentialConfigurationError(err)) {
      // #region agent log
      emitDebugLog({
        runId: "post-fix",
        hypothesisId: "H6",
        location: "semantic-search.ts:testEmbeddingConnection:credential-error",
        message: "Connection test classified as not_configured due to credential error",
        data: {
          statusCode:
            typeof (err as { statusCode?: unknown })?.statusCode === "number"
              ? (err as { statusCode: number }).statusCode
              : null,
        },
      });
      // #endregion
      return { ok: false, reason: "not_configured" };
    }
    // #region agent log
    emitDebugLog({
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "semantic-search.ts:testEmbeddingConnection:failed",
      message: "Connection test failed",
      data: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
    // #endregion
    console.warn("[semantic-search] Embedding connection test failed.", err);
    return { ok: false, reason: "failed" };
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
  const maxVectorDistance = asNonNegativeNumber(params.maxVectorDistance, 0.5);
  const queryEmbedding = toPgVectorLiteral(params.queryEmbedding);

  const { data, error } = await supabase.rpc("hybrid_company_search", {
    p_query: query,
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
    p_rrf_k: rrfK,
    p_fts_weight: ftsWeight,
    p_vector_weight: vectorWeight,
    p_max_vector_distance: maxVectorDistance,
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
    const settings = await resolveSemanticSearchSettings(supabase);
    if (!settings.semanticSearchEnabled) {
      // Skip embedding generation entirely when semantic search is disabled.
      return;
    }
    if (!settings.autoBackfillEmbeddings) {
      return;
    }

    const text = buildCompanySemanticDocument(input);
    if (text.length < 10) {
      return;
    }

    const embedding = await createCompanySearchEmbedding(
      { text, signal, supabase },
      settings,
    );
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
