/**
 * @vitest-environment node
 * Ensures {@link handleSupabaseError} skips the browser toast when `window` is undefined.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

describe("handleSupabaseError (Node, no window)", () => {
  beforeEach(() => {
    vi.spyOn(console, "group").mockImplementation(() => undefined);
    vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.mocked(console.group).mockRestore();
    vi.mocked(console.groupEnd).mockRestore();
    vi.mocked(console.error).mockRestore();
  });

  it("returns formatted error without calling toast", async () => {
    const { handleSupabaseError } = await import("./db-error-utils");
    const { toast } = await import("sonner");

    const err = handleSupabaseError("db down", "ctx");

    expect(err.message).toBe("Database error: db down");
    expect(toast.error).not.toHaveBeenCalled();
  });
});
