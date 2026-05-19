import { describe, expect, it } from "vitest";
import {
  computePdfPageSlices,
  createStandortanalysePdfFilename,
  sanitizePdfFilenamePart,
} from "@/lib/standortanalyse/standortanalyse-pdf-export";

describe("sanitizePdfFilenamePart", () => {
  it("normalizes umlauts and special chars", () => {
    expect(sanitizePdfFilenamePart("München Süd/West")).toBe("Munchen_Sud_West");
  });

  it("returns fallback when empty", () => {
    expect(sanitizePdfFilenamePart("   ")).toBe("standortanalyse");
  });
});

describe("createStandortanalysePdfFilename", () => {
  it("builds deterministic filename for analysis id", () => {
    expect(
      createStandortanalysePdfFilename({
        ort: "Frankfurt am Main",
        analysisId: "12345678-abcd-4f11-9333-0123456789ab",
      }),
    ).toBe("Standortanalyse_Frankfurt_am_Main_12345678.pdf");
  });
});

describe("computePdfPageSlices", () => {
  it("returns a single slice when content fits one page", () => {
    const slices = computePdfPageSlices({
      canvasWidthPx: 2000,
      canvasHeightPx: 1800,
      pageWidthMm: 210,
      pageHeightMm: 297,
      contentWidthMm: 186,
      contentHeightMm: 241,
    });

    expect(slices).toHaveLength(1);
    expect(slices[0]?.sourceY).toBe(0);
  });

  it("splits long content into multiple pages", () => {
    const slices = computePdfPageSlices({
      canvasWidthPx: 1400,
      canvasHeightPx: 7200,
      pageWidthMm: 210,
      pageHeightMm: 297,
      contentWidthMm: 186,
      contentHeightMm: 241,
    });

    expect(slices.length).toBeGreaterThan(1);
    const lastSlice = slices.at(-1);
    expect(lastSlice?.sourceY).toBeGreaterThan(0);
    expect(lastSlice?.targetHeightMm).toBeGreaterThan(0);
  });
});
