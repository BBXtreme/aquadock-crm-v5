import { afterEach, vi } from "vitest";

/**
 * Stubs `console` methods used by {@link handleSupabaseError} so tests that intentionally
 * trigger database errors do not spam Vitest stdout/stderr.
 *
 * Call **once** at the start of a `describe` block. Registers an `afterEach` that clears
 * spy call history (works together with `vi.clearAllMocks()` in `beforeEach` if you use it).
 */
export function silenceHandleSupabaseErrorConsole(): void {
  const groupSpy = vi.spyOn(console, "group").mockImplementation(() => undefined);
  const groupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  afterEach(() => {
    groupSpy.mockClear();
    groupEndSpy.mockClear();
    errorSpy.mockClear();
  });
}
