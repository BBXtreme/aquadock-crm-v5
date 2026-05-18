import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const deleteEq = vi.fn();
const deleteChain = {
  eq: vi.fn(() => deleteChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: deleteEq,
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/standortanalyse/persistence", () => ({
  toStandortanalyseFormFromRows: vi.fn(),
}));

vi.mock("@/lib/standortanalyse/scoring", () => ({
  calculateStandortScore: vi.fn(),
}));

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
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });
    expect(response.status).toBe(401);
  });

  it("deletes analysis for owner", async () => {
    const { DELETE } = await import("./route");
    const id = "00000000-0000-4000-8000-000000000001";
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
