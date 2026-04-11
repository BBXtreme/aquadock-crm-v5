import { describe, expect, it } from "vitest";
import { mapProviderSchema, mapSettingsFormSchema } from "./map-settings";

describe("mapProviderSchema", () => {
  it("accepts osm", () => {
    expect(mapProviderSchema.parse("osm")).toBe("osm");
  });

  it("accepts google and apple", () => {
    expect(mapProviderSchema.parse("google")).toBe("google");
    expect(mapProviderSchema.parse("apple")).toBe("apple");
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

  it("preserves explicit null for optional keys and omits undefined when keys absent", () => {
    const withNulls = mapSettingsFormSchema.parse({
      map_provider: "apple",
      google_maps_api_key: null,
      apple_mapkit_token: null,
    });
    expect(withNulls.google_maps_api_key).toBeNull();
    expect(withNulls.apple_mapkit_token).toBeNull();

    const minimal = mapSettingsFormSchema.parse({
      map_provider: "osm",
    });
    expect(minimal).toEqual({ map_provider: "osm" });
  });

  it("rejects keys longer than max length", () => {
    expect(() =>
      mapSettingsFormSchema.parse({
        map_provider: "google",
        google_maps_api_key: "k".repeat(501),
      }),
    ).toThrow(/Google API/);

    expect(() =>
      mapSettingsFormSchema.parse({
        map_provider: "apple",
        apple_mapkit_token: "t".repeat(2001),
      }),
    ).toThrow(/MapKit/);
  });

  it("rejects unknown keys under strict", () => {
    expect(() =>
      mapSettingsFormSchema.parse({
        map_provider: "osm",
        extra: "nope",
      } as Record<string, unknown>),
    ).toThrow();
  });
});
