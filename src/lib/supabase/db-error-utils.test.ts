import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleSupabaseError } from "./db-error-utils";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("handleSupabaseError", () => {
  const groupSpy = vi.spyOn(console, "group").mockImplementation(() => {
    return undefined;
  });
  const groupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {
    return undefined;
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
    return undefined;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    groupSpy.mockClear();
    groupEndSpy.mockClear();
    errorSpy.mockClear();
  });

  it("formats string error", () => {
    const err = handleSupabaseError("boom", "ctx");
    expect(err.message).toBe("Database error: boom");
  });

  it("formats Error instance", () => {
    const err = handleSupabaseError(new Error("e1"), "ctx");
    expect(err.message).toBe("Database error: e1");
  });

  it("uses nested error object fields", () => {
    const err = handleSupabaseError(
      { error: { message: "nested", code: "PGRST116" } },
      "ctx",
    );
    expect(err.message).toContain("nested");
    expect(err.message).toContain("PGRST116");
  });

  it("collects top-level message and hint", () => {
    const err = handleSupabaseError(
      { message: "m", hint: "h", details: "d", code: "c" },
      "ctx",
    );
    expect(err.message).toContain("m");
  });

  it("falls back to unknown message for empty object", () => {
    const err = handleSupabaseError({}, "ctx");
    expect(err.message).toBe("Database error: An unknown database error occurred");
  });

  it("shows toast in jsdom (browser branch)", () => {
    handleSupabaseError("x", "myContext");
    expect(toast.error).toHaveBeenCalledWith(
      "Error in myContext",
      expect.objectContaining({ description: "x" }),
    );
  });
});
