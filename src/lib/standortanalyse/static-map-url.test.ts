import { describe, expect, it } from "vitest";
import { buildStandortStaticMapUrl } from "@/lib/standortanalyse/static-map-url";

describe("buildStandortStaticMapUrl", () => {
  it("creates a static map URL with default dimensions", () => {
    const url = buildStandortStaticMapUrl(50.110924, 8.682127);

    expect(url).toContain("https://staticmap.openstreetmap.de/staticmap.php");
    expect(url).toContain("size=960x420");
    expect(url).toContain("zoom=14");
    expect(url).toContain("50.110924%2C8.682127");
  });

  it("applies provided dimensions and zoom", () => {
    const url = buildStandortStaticMapUrl(52.52, 13.405, {
      width: 1200,
      height: 500,
      zoom: 12,
    });

    expect(url).toContain("size=1200x500");
    expect(url).toContain("zoom=12");
  });
});
