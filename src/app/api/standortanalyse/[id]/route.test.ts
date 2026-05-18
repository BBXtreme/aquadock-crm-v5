/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const deleteEq = vi.hoisted(() => vi.fn());
const analysisMaybeSingle = vi.hoisted(() => vi.fn());
const scoresEq = vi.hoisted(() => vi.fn());
const mockToForm = vi.hoisted(() => vi.fn());
const mockCalculateScore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from: vi.fn((table: string) => {
      if (table === "standortanalysen") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: analysisMaybeSingle,
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: deleteEq,
            })),
          })),
        };
      }
      if (table === "standortanalyse_scores") {
        return {
          select: vi.fn().mockReturnValue({
            eq: scoresEq,
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  })),
}));

vi.mock("@/lib/standortanalyse/persistence", () => ({
  toStandortanalyseFormFromRows: (...args: unknown[]) => mockToForm(...args),
}));

vi.mock("@/lib/standortanalyse/scoring", () => ({
  calculateStandortScore: (...args: unknown[]) => mockCalculateScore(...args),
}));

const ANALYSIS_ID = "00000000-0000-4000-8000-000000000001";
const analysisRow = {
  id: ANALYSIS_ID,
  status: "draft",
  created_at: "2026-05-18T10:00:00.000Z",
  updated_at: "2026-05-18T10:00:00.000Z",
  submitted_at: null,
  total_points: 77,
  recommendation: "Guter Standort",
};

describe("GET /api/standortanalyse/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    analysisMaybeSingle.mockResolvedValue({ data: analysisRow, error: null });
    scoresEq.mockResolvedValue({ data: [], error: null });
    mockToForm.mockReturnValue({
      kontakt: { name: "Mustermann", vorname: "Max", email: "max@example.com" },
      standort: { plz: "10115", ort: "Berlin", land: "DE", datum: "2026-05-18" },
      kriterien: { gewaesserart: "See", standortfrequentierung: 25 },
      notizen: null,
    });
    mockCalculateScore.mockReturnValue({
      totalPoints: 77,
      recommendation: { label: "Guter Standort" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when analysis is not found", async () => {
    analysisMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 500 when analysis query fails", async () => {
    analysisMaybeSingle.mockResolvedValue({ data: null, error: { message: "db error" } });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when scores query fails", async () => {
    scoresEq.mockResolvedValue({ data: null, error: { message: "scores error" } });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(500);
  });

  it("returns analysis, formData and score for owner", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.id).toBe(ANALYSIS_ID);
    expect(body.formData.kontakt.email).toBe("max@example.com");
    expect(body.score.totalPoints).toBe(77);
    expect(mockToForm).toHaveBeenCalled();
    expect(mockCalculateScore).toHaveBeenCalled();
  });
});

describe("DELETE /api/standortanalyse/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    deleteEq.mockResolvedValue({ error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(401);
  });

  it("deletes analysis for owner", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns 500 when delete fails", async () => {
    deleteEq.mockResolvedValue({ error: { message: "delete failed" } });
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: ANALYSIS_ID }),
    });
    expect(response.status).toBe(500);
  });
});
