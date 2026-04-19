import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCompanySemanticDocument,
  COMPANY_SEARCH_EMBEDDING_DIMENSION,
  createXaiEmbedding,
  generateAndStoreCompanyEmbedding,
  hybridCompanySearch,
} from "./semantic-search";

const VECTOR = Array.from({ length: COMPANY_SEARCH_EMBEDDING_DIMENSION }, (_, i) => i / 1000);

describe("semantic-search service", () => {
  const originalApiKey = process.env.XAI_API_KEY;
  const originalEmbApiKey = process.env.XAI_EMBEDDING_API_KEY;
  const originalEmbUrl = process.env.XAI_EMBEDDINGS_URL;

  beforeEach(() => {
    process.env.XAI_API_KEY = "test-key";
    delete process.env.XAI_EMBEDDING_API_KEY;
    delete process.env.XAI_EMBEDDINGS_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.XAI_API_KEY = originalApiKey;
    process.env.XAI_EMBEDDING_API_KEY = originalEmbApiKey;
    process.env.XAI_EMBEDDINGS_URL = originalEmbUrl;
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

  it("createXaiEmbedding rejects empty text", async () => {
    await expect(createXaiEmbedding({ text: "   " })).rejects.toThrow("Cannot generate embedding for empty text.");
  });

  it("createXaiEmbedding parses a valid xAI response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: VECTOR }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedding = await createXaiEmbedding({ text: "find marina hotels" });

    expect(embedding).toHaveLength(COMPANY_SEARCH_EMBEDDING_DIMENSION);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createXaiEmbedding throws on non-200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "model not found",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createXaiEmbedding({ text: "query" })).rejects.toThrow("xAI embeddings request failed (404)");
  });

  it("createXaiEmbedding throws on wrong embedding dimension", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [1, 2, 3] }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createXaiEmbedding({ text: "query" })).rejects.toThrow("xAI embedding dimension mismatch");
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
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const supabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    await generateAndStoreCompanyEmbedding(
      supabase,
      "company-id",
      {
        firmenname: "",
      },
      undefined,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generateAndStoreCompanyEmbedding swallows update errors (best effort)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: VECTOR }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const eq = vi.fn().mockResolvedValue({ error: { message: "write failed" } });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    const supabase = {
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
