import { describe, expect, it } from "vitest";
import { formatFileSizeBytes } from "./format-file-size";

describe("formatFileSizeBytes", () => {
  it("returns empty string for NaN or negative bytes", () => {
    expect(formatFileSizeBytes(Number.NaN, "de-DE")).toBe("");
    expect(formatFileSizeBytes(-1, "de-DE")).toBe("");
  });

  it("formats bytes without decimal when unit is B", () => {
    expect(formatFileSizeBytes(0, "en-US")).toBe("0 B");
    expect(formatFileSizeBytes(1023, "en-US")).toBe("1023 B");
  });

  it("uses locale for fractional units above B", () => {
    const kb = formatFileSizeBytes(1536, "de-DE");
    expect(kb).toMatch(/KB$/);
    expect(kb).toContain("5");
    const gb = formatFileSizeBytes(3 * 1024 * 1024 * 1024, "en-US");
    expect(gb).toMatch(/GB$/);
  });
});
