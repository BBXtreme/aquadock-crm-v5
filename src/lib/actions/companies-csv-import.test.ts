import { beforeEach, describe, expect, it, vi } from "vitest";

const generateAndStoreCompanyEmbedding = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/services/semantic-search", () => ({
  generateAndStoreCompanyEmbedding,
}));

const getCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const USER_ID = "10000000-0000-4000-8000-000000000099";

const EXISTING = {
  id: "20000000-0000-4000-8000-000000000001",
  firmenname: "Existing GmbH",
  stadt: "München",
  plz: "80331",
  website: "https://example.com",
  osm: "node/999",
};

function mockSupabaseForCsvImport(opts: {
  dedupeRows: typeof EXISTING[];
  insertData: Record<string, unknown>[] | null;
}) {
  const { dedupeRows, insertData } = opts;
  createServerSupabaseClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "timeline") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table !== "companies") {
        return {};
      }
      return {
        select: vi.fn(() => ({
          is: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: dedupeRows, error: null }),
            or: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: insertData, error: null }),
        })),
      };
    }),
  } as never);
}

describe("previewCsvImportDuplicates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no user", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { previewCsvImportDuplicates } = await import("@/lib/actions/companies");
    const res = await previewCsvImportDuplicates([{ firmenname: "A", kundentyp: "restaurant" }]);
    expect(res).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns analyses with db match when OSM collides", async () => {
    getCurrentUser.mockResolvedValue({ id: USER_ID } as never);
    mockSupabaseForCsvImport({ dedupeRows: [EXISTING], insertData: [] });
    const { previewCsvImportDuplicates } = await import("@/lib/actions/companies");
    const res = await previewCsvImportDuplicates([
      {
        firmenname: "New Co",
        kundentyp: "restaurant",
        osm: "node/999",
      },
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }
    expect(res.analyses[0]?.dbMatch?.tier).toBe("osm");
  });
});

describe("importCompaniesFromCSV duplicate handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips duplicate rows unless forced", async () => {
    getCurrentUser.mockResolvedValue({ id: USER_ID } as never);
    mockSupabaseForCsvImport({
      dedupeRows: [EXISTING],
      insertData: [],
    });
    const { importCompaniesFromCSV } = await import("@/lib/actions/companies");
    const result = await importCompaniesFromCSV([
      {
        firmenname: "Dup",
        kundentyp: "restaurant",
        osm: "node/999",
      },
    ]);
    expect(result.imported).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.skippedUserExcluded).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("imports duplicate row when index is forced", async () => {
    getCurrentUser.mockResolvedValue({ id: USER_ID } as never);
    const inserted = {
      id: "30000000-0000-4000-8000-000000000003",
      firmenname: "Dup",
      kundentyp: "restaurant",
      status: "lead",
    };
    mockSupabaseForCsvImport({
      dedupeRows: [EXISTING],
      insertData: [inserted],
    });
    const { importCompaniesFromCSV } = await import("@/lib/actions/companies");
    const result = await importCompaniesFromCSV(
      [
        {
          firmenname: "Dup",
          kundentyp: "restaurant",
          osm: "node/999",
        },
      ],
      { forceImportRowIndices: [0] },
    );
    expect(result.imported).toBe(1);
    expect(result.skippedDuplicates).toBe(0);
    expect(result.skippedUserExcluded).toBe(0);
  });

  it("skips user-excluded row when otherwise eligible", async () => {
    getCurrentUser.mockResolvedValue({ id: USER_ID } as never);
    const inserted = {
      id: "30000000-0000-4000-8000-000000000004",
      firmenname: "Keep",
      kundentyp: "restaurant",
      status: "lead",
    };
    mockSupabaseForCsvImport({
      dedupeRows: [],
      insertData: [inserted],
    });
    const { importCompaniesFromCSV } = await import("@/lib/actions/companies");
    const result = await importCompaniesFromCSV(
      [
        { firmenname: "Skip me", kundentyp: "restaurant" },
        { firmenname: "Keep", kundentyp: "restaurant" },
      ],
      { excludeImportRowIndices: [0] },
    );
    expect(result.imported).toBe(1);
    expect(result.skippedUserExcluded).toBe(1);
    expect(result.skippedDuplicates).toBe(0);
  });
});
