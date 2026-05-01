import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEmbed = vi.hoisted(() => vi.fn());
const mockGatewayModel = vi.hoisted(() => vi.fn((id: string) => ({ provider: "gateway", id })));
const mockCreateGateway = vi.hoisted(() =>
  vi.fn(() => ({
    embeddingModel: mockGatewayModel,
  })),
);
const mockOpenaiTextEmbedding = vi.hoisted(() => vi.fn((model: string) => ({ provider: "openai", model })));

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

vi.mock("@ai-sdk/gateway", () => ({
  createGateway: () => mockCreateGateway(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: {
    textEmbedding: (id: string) => mockOpenaiTextEmbedding(id),
  },
}));

import {
  buildCompanySemanticDocument,
  COMPANY_SEARCH_EMBEDDING_DIMENSION,
  createCompanySearchEmbedding,
  createXaiEmbedding,
  DEFAULT_SEMANTIC_SETTINGS,
  generateAndStoreCompanyEmbedding,
  hybridCompanySearch,
  resolveSemanticSearchSettings,
  testEmbeddingConnection,
} from "./semantic-search";

const VECTOR = Array.from({ length: COMPANY_SEARCH_EMBEDDING_DIMENSION }, (_, i) => i / 1000);

describe("semantic-search service", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockEmbed.mockReset();
    mockGatewayModel.mockClear();
    mockCreateGateway.mockClear();
    mockOpenaiTextEmbedding.mockClear();
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("buildCompanySemanticDocument includes non-empty labeled fields only", () => {
    const doc = buildCompanySemanticDocument({
      firmenname: "AquaDock",
      stadt: "Rostock",
      notes: "Near marina",
      website: "  ",
      email: null,
    });

    expect(doc).toContain("Company: AquaDock");
    expect(doc).toContain("City: Rostock");
    expect(doc).toContain("Notes: Near marina");
    expect(doc).not.toContain("Website:");
    expect(doc).not.toContain("Email:");
  });

  it("buildCompanySemanticDocument includes optional fields when present", () => {
    const doc = buildCompanySemanticDocument({
      firmenname: "X",
      kundentyp: "B2B",
      firmentyp: "GmbH",
      rechtsform: "AG",
      strasse: "Hafen 1",
      plz: "18055",
      bundesland: "MV",
      land: "DE",
      status: "lead",
      wassertyp: "See",
      website: "https://x.test",
      email: "a@b.c",
      telefon: "+1",
    });
    expect(doc).toContain("CustomerType: B2B");
    expect(doc).toContain("LegalForm: AG");
    expect(doc).toContain("WaterType: See");
    expect(doc).toContain("Phone: +1");
  });

  it("createCompanySearchEmbedding rejects empty text", async () => {
    await expect(createCompanySearchEmbedding({ text: "   " })).rejects.toThrow(
      "Cannot generate embedding for empty text.",
    );
  });

  it("createCompanySearchEmbedding uses SDK and validates dimensions", async () => {
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    const embedding = await createCompanySearchEmbedding({
      text: "find marina hotels",
    });

    expect(embedding).toHaveLength(COMPANY_SEARCH_EMBEDDING_DIMENSION);
    expect(mockGatewayModel).toHaveBeenCalledWith("openai/text-embedding-3-small");
    expect(mockEmbed).toHaveBeenCalledTimes(1);
  });

  it("createCompanySearchEmbedding routes xai provider through gateway model ids", async () => {
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await expect(
      createCompanySearchEmbedding(
        { text: "query" },
        {
          embeddingProvider: "xai",
          embeddingModel: "grok-embedding-small",
          semanticSearchEnabled: true,
          autoBackfillEmbeddings: true,
          showSemanticBadge: true,
        },
      ),
    ).resolves.toHaveLength(COMPANY_SEARCH_EMBEDDING_DIMENSION);
    expect(mockGatewayModel).toHaveBeenCalledWith("xai/grok-embedding-small");
  });

  it("createCompanySearchEmbedding forces xai grok model when settings name a different model", async () => {
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await createCompanySearchEmbedding(
      { text: "query" },
      {
        embeddingProvider: "xai",
        embeddingModel: "other-model",
        semanticSearchEnabled: true,
        autoBackfillEmbeddings: true,
        showSemanticBadge: true,
      },
    );
    expect(mockGatewayModel).toHaveBeenCalledWith("xai/grok-embedding-small");
  });

  it("createCompanySearchEmbedding uses OpenAI direct provider when configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.AI_GATEWAY_API_KEY;
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await createCompanySearchEmbedding(
      { text: "query" },
      {
        embeddingProvider: "openai",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: true,
        autoBackfillEmbeddings: true,
        showSemanticBadge: true,
      },
    );
    expect(mockOpenaiTextEmbedding).toHaveBeenCalledWith("text-embedding-3-small");
    expect(mockCreateGateway).not.toHaveBeenCalled();
  });

  it("createCompanySearchEmbedding uses text-embedding-3-large for OpenAI when requested", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.AI_GATEWAY_API_KEY;
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await createCompanySearchEmbedding(
      { text: "query" },
      {
        embeddingProvider: "openai",
        embeddingModel: "text-embedding-3-large",
        semanticSearchEnabled: true,
        autoBackfillEmbeddings: true,
        showSemanticBadge: true,
      },
    );
    expect(mockOpenaiTextEmbedding).toHaveBeenCalledWith("text-embedding-3-large");
  });

  it("createCompanySearchEmbedding falls back to small OpenAI model for unsupported model ids", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.AI_GATEWAY_API_KEY;
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await createCompanySearchEmbedding(
      { text: "query" },
      {
        embeddingProvider: "openai",
        embeddingModel: "custom-embedding",
        semanticSearchEnabled: true,
        autoBackfillEmbeddings: true,
        showSemanticBadge: true,
      },
    );
    expect(mockOpenaiTextEmbedding).toHaveBeenCalledWith("text-embedding-3-small");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("createCompanySearchEmbedding throws on wrong embedding dimension", async () => {
    mockEmbed.mockResolvedValue({ embedding: [1, 2, 3] });
    await expect(createCompanySearchEmbedding({ text: "query" })).rejects.toThrow("Embedding dimension mismatch");
  });

  it("createCompanySearchEmbedding throws when SDK returns a non-array embedding", async () => {
    mockEmbed.mockResolvedValue({ embedding: "not-an-array" as unknown as number[] });
    await expect(createCompanySearchEmbedding({ text: "query" })).rejects.toThrow(
      "Embedding response did not return an embedding array.",
    );
  });

  it("createCompanySearchEmbedding throws when gateway key is missing", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    await expect(createCompanySearchEmbedding({ text: "query" })).rejects.toThrow(
      'Missing credentials for embedding provider "gateway".',
    );
  });

  it("createCompanySearchEmbedding throws when OpenAI key is missing for openai provider", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      createCompanySearchEmbedding(
        { text: "query" },
        {
          embeddingProvider: "openai",
          embeddingModel: "text-embedding-3-small",
          semanticSearchEnabled: true,
          autoBackfillEmbeddings: true,
          showSemanticBadge: true,
        },
      ),
    ).rejects.toThrow('Missing credentials for embedding provider "openai".');
  });

  it("createCompanySearchEmbedding throws when semantic search is disabled", async () => {
    await expect(
      createCompanySearchEmbedding(
        { text: "hello" },
        { ...DEFAULT_SEMANTIC_SETTINGS, semanticSearchEnabled: false },
      ),
    ).rejects.toThrow("Semantic search is disabled for this user.");
  });

  it("createXaiEmbedding uses default model when model omitted", async () => {
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await expect(createXaiEmbedding({ text: "hello" })).resolves.toHaveLength(COMPANY_SEARCH_EMBEDDING_DIMENSION);
    expect(mockGatewayModel).toHaveBeenCalledWith("xai/grok-embedding-small");
  });

  it("testEmbeddingConnection reports disabled semantic search", async () => {
    await expect(
      testEmbeddingConnection({
        embeddingProvider: "gateway",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: false,
      }),
    ).resolves.toEqual({ ok: false, reason: "disabled" });
  });

  it("testEmbeddingConnection reports missing credentials", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      testEmbeddingConnection({
        embeddingProvider: "openai",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: true,
      }),
    ).resolves.toEqual({ ok: false, reason: "not_configured" });
  });

  it("testEmbeddingConnection returns connected when embed succeeds", async () => {
    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await expect(
      testEmbeddingConnection({
        embeddingProvider: "gateway",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: true,
      }),
    ).resolves.toEqual({ ok: true, reason: "connected" });
  });

  it("testEmbeddingConnection maps invalid API key failures to not_configured", async () => {
    mockEmbed.mockRejectedValue(new Error("Incorrect API key provided"));
    await expect(
      testEmbeddingConnection({
        embeddingProvider: "gateway",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: true,
      }),
    ).resolves.toEqual({ ok: false, reason: "not_configured" });
  });

  it("testEmbeddingConnection returns failed for unrelated embedding errors", async () => {
    mockEmbed.mockRejectedValue(new Error("rate limit exceeded"));
    await expect(
      testEmbeddingConnection({
        embeddingProvider: "gateway",
        embeddingModel: "text-embedding-3-small",
        semanticSearchEnabled: true,
      }),
    ).resolves.toEqual({ ok: false, reason: "failed" });
  });

  it("resolveSemanticSearchSettings returns env-based defaults without supabase", async () => {
    process.env.EMBEDDING_PROVIDER = "openai";
    process.env.EMBEDDING_MODEL = "text-embedding-3-large";
    const settings = await resolveSemanticSearchSettings();
    expect(settings.embeddingProvider).toBe("openai");
    expect(settings.embeddingModel).toBe("text-embedding-3-large");
  });

  it("resolveSemanticSearchSettings maps vercel embedding provider env to gateway", async () => {
    process.env.EMBEDDING_PROVIDER = "vercel";
    const settings = await resolveSemanticSearchSettings();
    expect(settings.embeddingProvider).toBe("gateway");
  });

  it("resolveSemanticSearchSettings warns and falls back when user embedding_provider is unsupported", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ key: "embedding_provider", value: "bogus" }],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingProvider).toBe("gateway");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("resolveSemanticSearchSettings parses boolean settings from stringy values", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { key: "semantic_search_enabled", value: "1" },
            { key: "auto_backfill_embeddings", value: "0" },
            { key: "show_semantic_badge", value: "false" },
          ],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.semanticSearchEnabled).toBe(true);
    expect(settings.autoBackfillEmbeddings).toBe(false);
    expect(settings.showSemanticBadge).toBe(false);
  });

  it("resolveSemanticSearchSettings treats blank user embedding_model as default", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ key: "embedding_model", value: "   " }],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingModel).toBe("text-embedding-3-small");
  });

  it("resolveSemanticSearchSettings ignores non-string embedding_model from user rows", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ key: "embedding_model", value: 12345 }],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingModel).toBe("text-embedding-3-small");
  });

  it("resolveSemanticSearchSettings falls back when auth returns an error", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: { message: "jwt expired" } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingProvider).toBe("gateway");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("resolveSemanticSearchSettings falls back when getUser throws", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockRejectedValue(new Error("network")) },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingProvider).toBe("gateway");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("resolveSemanticSearchSettings falls back when auth returns no user", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.embeddingProvider).toBe("gateway");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("resolveSemanticSearchSettings falls back when settings query errors", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: { message: "query failed" } }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.semanticSearchEnabled).toBe(true);
  });

  it("resolveSemanticSearchSettings uses defaults when user has no rows", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings.semanticSearchEnabled).toBe(true);
    expect(settings.autoBackfillEmbeddings).toBe(true);
    expect(settings.showSemanticBadge).toBe(true);
    expect(settings.embeddingProvider).toBe("gateway");
    expect(settings.embeddingModel).toBe("text-embedding-3-small");
  });

  it("resolveSemanticSearchSettings applies user rows over defaults", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { key: "embedding_provider", value: "xai" },
            { key: "embedding_model", value: "text-embedding-3-large" },
            { key: "semantic_search_enabled", value: false },
            { key: "auto_backfill_embeddings", value: false },
            { key: "show_semantic_badge", value: false },
          ],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const settings = await resolveSemanticSearchSettings(supabase);
    expect(settings).toEqual({
      embeddingProvider: "xai",
      embeddingModel: "text-embedding-3-large",
      semanticSearchEnabled: false,
      autoBackfillEmbeddings: false,
      showSemanticBadge: false,
    });
  });

  it("hybridCompanySearch returns empty array for blank query", async () => {
    const supabase = { rpc: vi.fn() } as unknown as SupabaseClient;
    await expect(
      hybridCompanySearch(supabase, {
        query: "  ",
        queryEmbedding: VECTOR,
      }),
    ).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("hybridCompanySearch propagates RPC errors", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc down") }),
    } as unknown as SupabaseClient;

    await expect(
      hybridCompanySearch(supabase, {
        query: "x",
        queryEmbedding: VECTOR,
      }),
    ).rejects.toThrow("rpc down");
  });

  it("hybridCompanySearch validates embedding dimensions", async () => {
    const supabase = {
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(
      hybridCompanySearch(supabase, {
        query: "marina",
        queryEmbedding: [0, 1, 2],
      }),
    ).rejects.toThrow("Invalid query embedding passed to hybridCompanySearch");
  });

  it("hybridCompanySearch sanitizes RPC tuning parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    await hybridCompanySearch(supabase, {
      query: "q",
      queryEmbedding: VECTOR,
      matchCount: -5,
      rrfK: 0,
      ftsWeight: -2,
      vectorWeight: Number.NaN,
      maxVectorDistance: -0.1,
    });

    expect(rpc).toHaveBeenCalledWith(
      "hybrid_company_search",
      expect.objectContaining({
        p_match_count: 200,
        p_rrf_k: 60,
        p_fts_weight: 1,
        p_vector_weight: 1,
        p_max_vector_distance: 0.5,
      }),
    );
  });

  it("hybridCompanySearch floors fractional fts and vector ranks", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ company_id: "c1", rrf_score: 0.5, fts_rank: 2.9, vector_rank: 4.2 }],
      error: null,
    });
    const rows = await hybridCompanySearch({ rpc } as never, { query: "q", queryEmbedding: VECTOR });
    expect(rows).toEqual([
      { companyId: "c1", rrfScore: 0.5, ftsRank: 2, vectorRank: 4 },
    ]);
  });

  it("hybridCompanySearch drops rows with non-finite rrf_score", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { company_id: "bad", rrf_score: Number.NaN, fts_rank: 1, vector_rank: null },
        { company_id: "good", rrf_score: 0.4, fts_rank: null, vector_rank: 2.2 },
      ],
      error: null,
    });
    const rows = await hybridCompanySearch({ rpc } as never, { query: "x", queryEmbedding: VECTOR });
    expect(rows).toEqual([
      { companyId: "good", rrfScore: 0.4, ftsRank: null, vectorRank: 2 },
    ]);
  });

  it("hybridCompanySearch maps RPC rows and drops invalid entries", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          company_id: "company-1",
          rrf_score: 0.72,
          fts_rank: 2.9,
          vector_rank: null,
        },
        {
          company_id: 123,
          rrf_score: 0.55,
          fts_rank: 4,
          vector_rank: 1,
        },
      ],
      error: null,
    });

    const supabase = {
      rpc,
    } as unknown as SupabaseClient;

    const rows = await hybridCompanySearch(supabase, {
      query: " marina ",
      queryEmbedding: VECTOR,
      matchCount: 10,
    });

    expect(rows).toEqual([
      {
        companyId: "company-1",
        rrfScore: 0.72,
        ftsRank: 2,
        vectorRank: null,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("hybrid_company_search", expect.objectContaining({ p_query: "marina" }));
  });

  it("generateAndStoreCompanyEmbedding skips too-short semantic documents", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as unknown as SupabaseClient;

    await generateAndStoreCompanyEmbedding(
      supabase,
      "company-id",
      {
        firmenname: "",
      },
      undefined,
    );

    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("generateAndStoreCompanyEmbedding returns early when semantic search is disabled", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ key: "semantic_search_enabled", value: false }],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    mockEmbed.mockResolvedValue({ embedding: VECTOR });
    await generateAndStoreCompanyEmbedding(supabase, "company-id", {
      firmenname: "Enough text here for length",
    });
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("generateAndStoreCompanyEmbedding respects auto_backfill_embeddings=false", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ key: "auto_backfill_embeddings", value: false }],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    await generateAndStoreCompanyEmbedding(supabase, "company-id", { firmenname: "AquaDock" });
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("generateAndStoreCompanyEmbedding swallows update errors (best effort)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockEmbed.mockResolvedValue({ embedding: VECTOR });

    const eq = vi.fn().mockResolvedValue({ error: { message: "write failed" } });
    const update = vi.fn(() => ({ eq }));
    const from = vi
      .fn()
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }))
      .mockImplementationOnce(() => ({ update }));

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from,
    } as unknown as SupabaseClient;

    await expect(
      generateAndStoreCompanyEmbedding(
        supabase,
        "company-id",
        {
          firmenname: "AquaDock",
        },
        undefined,
      ),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
  });

  it("generateAndStoreCompanyEmbedding swallows embedding generation failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockEmbed.mockRejectedValue(new Error("embed failed"));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as unknown as SupabaseClient;

    await generateAndStoreCompanyEmbedding(supabase, "company-id", {
      firmenname: "Enough text here for length",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Embedding generation failed for company company-id"),
      expect.any(Error),
    );
  });
});
