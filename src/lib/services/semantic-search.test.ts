import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEmbed = vi.hoisted(() => vi.fn());
const mockGatewayModel = vi.hoisted(() => vi.fn((id: string) => ({ provider: "gateway", id })));
const mockCreateGateway = vi.hoisted(() =>
  vi.fn(() => ({
    embeddingModel: mockGatewayModel,
  })),
);

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

vi.mock("@ai-sdk/gateway", () => ({
  createGateway: () => mockCreateGateway(),
}));

import {
  buildCompanySemanticDocument,
  COMPANY_SEARCH_EMBEDDING_DIMENSION,
  createCompanySearchEmbedding,
  generateAndStoreCompanyEmbedding,
  hybridCompanySearch,
  resolveSemanticSearchSettings,
} from "./semantic-search";

const VECTOR = Array.from({ length: COMPANY_SEARCH_EMBEDDING_DIMENSION }, (_, i) => i / 1000);

describe("semantic-search service", () => {
  beforeEach(() => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockEmbed.mockReset();
    mockGatewayModel.mockClear();
    mockCreateGateway.mockClear();
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.AI_GATEWAY_API_KEY;
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
    expect(mockGatewayModel).toHaveBeenCalledWith("xai/text-embedding-3-small");
  });

  it("createCompanySearchEmbedding throws on wrong embedding dimension", async () => {
    mockEmbed.mockResolvedValue({ embedding: [1, 2, 3] });
    await expect(createCompanySearchEmbedding({ text: "query" })).rejects.toThrow("Embedding dimension mismatch");
  });

  it("createCompanySearchEmbedding throws when gateway key is missing", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    await expect(createCompanySearchEmbedding({ text: "query" })).rejects.toThrow("AI Gateway key is not configured.");
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
    expect(settings.embeddingProvider).toBe("openai");
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
});
