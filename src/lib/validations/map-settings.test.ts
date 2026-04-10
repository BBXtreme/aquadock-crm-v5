import { describe, expect, it } from "vitest";
import { mapProviderSchema, mapSettingsFormSchema } from "./map-settings";

describe("mapProviderSchema", () => {
  it("accepts osm", () => {
    expect(mapProviderSchema.parse("osm")).toBe("osm");
  });

  it("rejects invalid", () => {
    expect(() => mapProviderSchema.parse("bing")).toThrow();
  });
});

describe("mapSettingsFormSchema", () => {
  it("parses osm with null keys from empty strings", () => {
    const out = mapSettingsFormSchema.parse({
      map_provider: "osm",
      google_maps_api_key: "",
      apple_mapkit_token: "",
    });
    expect(out.map_provider).toBe("osm");
    expect(out.google_maps_api_key).toBeNull();
    expect(out.apple_mapkit_token).toBeNull();
  });

  it("keeps trimmed keys", () => {
    const out = mapSettingsFormSchema.parse({
      map_provider: "google",
      google_maps_api_key: "  key  ",
      apple_mapkit_token: null,
    });
    expect(out.google_maps_api_key).toBe("key");
  });
});
