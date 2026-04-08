/**
 * Tests for OpenMap/geo utilities: {@link ./map-utils.ts}, {@link ./calculateWaterDistance.ts},
 * plus {@link ../constants/map-status-colors.ts}, {@link ../constants/map-poi-config.ts}, {@link ../constants/wassertyp.ts}.
 */

import L from "leaflet";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors } from "@/lib/constants/map-status-colors";
import { OVERPASS_ENDPOINTS } from "@/lib/constants/overpass-endpoints";
import { determineWassertyp } from "@/lib/constants/wassertyp";
import { calculateWaterDistance } from "@/lib/utils/calculateWaterDistance";
import {
  fetchOsmPois,
  getOpenStreetMapUrl,
  getOsmPoiIcon,
  getStatusIcon,
  normalizeOsmId,
} from "@/lib/utils/map-utils";

/** Mirrors OpenMapView `isWgs84Degrees` — validates degree ranges for map markers. */
function isWgs84Degrees(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function finiteLatLon(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

describe("getStatusIcon + statusColors", () => {
  it.each([
    ["lead", "L", statusColors.lead],
    ["gewonnen", "G", statusColors.gewonnen],
    ["verloren", "V", statusColors.verloren],
    ["kunde", "K", statusColors.kunde],
    ["partner", "P", statusColors.partner],
    ["inaktiv", "I", statusColors.inaktiv],
    ["angebot", "A", statusColors.angebot],
    ["akquise", "A", statusColors.akquise],
    ["qualifiziert", "Q", statusColors.qualifiziert],
  ] as const)("maps status %s to first letter and color", (status, letter, color) => {
    const icon = getStatusIcon(status);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain(`background-color:${color}`);
    expect(html).toContain(`>${letter}<`);
  });

  it("normalizes status to lowercase for color lookup", () => {
    const lower = getStatusIcon("LEAD");
    const html = typeof lower.options.html === "string" ? lower.options.html : "";
    expect(html).toContain(statusColors.lead);
  });

  it("uses lead color and ? for undefined status", () => {
    const icon = getStatusIcon(undefined);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain(statusColors.lead);
    expect(html).toContain(">?<");
  });

  it("falls back to lead color for unknown CRM status keys", () => {
    const icon = getStatusIcon("interessant");
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain(statusColors.lead);
    expect(html).toContain(">I<");
  });
});

describe("getOsmPoiIcon", () => {
  it("uses light palette when not dark", () => {
    const icon = getOsmPoiIcon(false, false);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain("background-color:white");
    expect(html).toContain("border:2px solid #d1d5db");
    expect(html).toContain("color:#374151");
    expect(html).not.toContain("osm-poi-inner--enter");
  });

  it("uses dark palette when isDarkMode is true", () => {
    const icon = getOsmPoiIcon(true, false);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain("background-color:#374151");
    expect(html).toContain("border:2px solid #9ca3af");
    expect(html).toContain("color:white");
  });

  it("adds enter animation class when withEnterAnimation is true", () => {
    const icon = getOsmPoiIcon(false, true);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain("osm-poi-inner--enter");
  });
});

describe("getOpenStreetMapUrl", () => {
  it("returns empty string for null, undefined, and empty string", () => {
    expect(getOpenStreetMapUrl(null)).toBe("");
    expect(getOpenStreetMapUrl(undefined)).toBe("");
    expect(getOpenStreetMapUrl("")).toBe("");
  });

  it("builds OSM browse URL for node/way/relation ids", () => {
    expect(getOpenStreetMapUrl("node/123")).toBe("https://www.openstreetmap.org/node/123");
    expect(getOpenStreetMapUrl("way/456")).toBe("https://www.openstreetmap.org/way/456");
  });
});

describe("normalizeOsmId", () => {
  it("strips openstreetmap.org prefix to type/id", () => {
    expect(normalizeOsmId("https://www.openstreetmap.org/node/999")).toBe("node/999");
  });

  it("returns raw id when already compact", () => {
    expect(normalizeOsmId("relation/7")).toBe("relation/7");
  });
});

describe("map-poi-config poiCategories", () => {
  it("exposes stable category keys used by fetchOsmPois", () => {
    const keys = Object.keys(poiCategories);
    expect(keys).toContain("restaurant");
    expect(keys).toContain("marina");
    expect(keys).toContain("tourism");
  });

  it("includes shop= style tags for boat category", () => {
    expect(poiCategories.boat.tags).toContain("shop=boat");
    expect(poiCategories.boat.tags).toContain("shop=marine");
  });

  it("includes tourism= prefixed tags", () => {
    expect(poiCategories.tourism.tags.some((t) => t.startsWith("tourism="))).toBe(true);
  });
});

describe("determineWassertyp", () => {
  it("maps waterway river to Fluss", () => {
    expect(determineWassertyp({ waterway: "river" })).toBe("Fluss");
  });

  it("maps natural water lake to See", () => {
    expect(determineWassertyp({ natural: "water", water: "lake" })).toBe("See");
  });

  it("returns null when no tag value matches WASSERTYP_MAP", () => {
    expect(determineWassertyp({ foo: "bar" })).toBeNull();
  });

  it("returns null for empty tags", () => {
    expect(determineWassertyp({})).toBeNull();
  });
});

describe("WGS84 + coordinate preprocessing (mirrors OpenMapView rules)", () => {
  it("accepts boundary lat/lon", () => {
    expect(isWgs84Degrees(-90, -180)).toBe(true);
    expect(isWgs84Degrees(90, 180)).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    expect(isWgs84Degrees(91, 0)).toBe(false);
    expect(isWgs84Degrees(-91, 0)).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(isWgs84Degrees(0, 181)).toBe(false);
    expect(isWgs84Degrees(0, -181)).toBe(false);
  });

  it("parses numeric strings and rejects non-finite", () => {
    expect(finiteLatLon("53.5")).toBe(53.5);
    expect(finiteLatLon("")).toBeNull();
    expect(finiteLatLon("x")).toBeNull();
    expect(finiteLatLon(Number.NaN)).toBeNull();
  });
});

describe("fetchOsmPois", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves empty without calling fetch when activeCategories is empty", async () => {
    const bounds = L.latLngBounds(L.latLng(53, 8), L.latLng(54, 9));
    const promise = fetchOsmPois(bounds, []);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;
    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
    expect(result.query).toContain("[out:json]");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("dedupes elements with the same type/id in Overpass JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          { type: "node", id: 42, lat: 1, lon: 2, tags: {} },
          { type: "node", id: 42, lat: 3, lon: 4, tags: {} },
        ],
      }),
    } as Response);

    const bounds = L.latLngBounds(L.latLng(53, 8), L.latLng(54, 9));
    const promise = fetchOsmPois(bounds, ["restaurant"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toHaveLength(1);
    expect(result.totalFound).toBe(1);
    expect(result.query).toContain("amenity");
    expect(globalThis.fetch).toHaveBeenCalled();
    const firstCall = vi.mocked(globalThis.fetch).mock.calls[0];
    if (firstCall === undefined) {
      throw new Error("expected fetch to have been called");
    }
    const url = String(firstCall[0]);
    const primaryEndpoint = OVERPASS_ENDPOINTS[0];
    if (primaryEndpoint === undefined) {
      throw new Error("expected OVERPASS_ENDPOINTS to be non-empty");
    }
    expect(url.startsWith(primaryEndpoint)).toBe(true);
  });

  it("resolves empty pois when all endpoints fail (best-effort)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    } as Response);

    const bounds = L.latLngBounds(L.latLng(50, 5), L.latLng(51, 6));
    const promise = fetchOsmPois(bounds, ["ferry"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
    expect(result.query.length).toBeGreaterThan(0);
  });
});

describe("calculateWaterDistance", () => {
  const originalFetch = globalThis.fetch;
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    randomSpy.mockRestore();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns cached distance without calling fetch on second invocation", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          {
            type: "way",
            id: 1,
            tags: { waterway: "river" },
            geometry: [
              { lat: 52.52, lon: 13.405 },
              { lat: 52.521, lon: 13.405 },
            ],
          },
        ],
      }),
    } as Response);

    const lat = 52.52;
    const lon = 13.405;
    const first = await calculateWaterDistance(lat, lon);
    expect(first.distance).toBe(0);
    expect(first.wassertyp).toBe("Fluss");

    const second = await calculateWaterDistance(lat, lon);
    expect(second).toEqual(first);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null distance when Overpass returns no elements", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: [] }),
    } as Response);

    const out = await calculateWaterDistance(48.0, 11.0);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });

  it("rounds large distances to integer meters", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          {
            type: "way",
            id: 2,
            tags: { natural: "water", water: "lake" },
            geometry: [{ lat: 1, lon: 1 }],
          },
        ],
      }),
    } as Response);

    const out = await calculateWaterDistance(10, 10);
    expect(out.distance).not.toBeNull();
    if (out.distance !== null) {
      expect(Number.isInteger(out.distance)).toBe(true);
      expect(out.distance).toBeGreaterThan(1_000_000);
    }
  });

  it("handles NaN coordinates without throwing when Overpass returns no usable geometry", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("is_in(")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      } as Response;
    });

    const out = await calculateWaterDistance(Number.NaN, Number.NaN);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });

  it("uses is_in fallback with distance 0 when fallback returns water area", async () => {
    let fetchCalls = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls += 1;
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("is_in(")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [{ type: "area", id: 1, tags: { natural: "water", water: "lake" } }],
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      } as Response;
    });

    const out = await calculateWaterDistance(55.0, 12.0);
    expect(fetchCalls).toBeGreaterThanOrEqual(5);
    expect(out.distance).toBe(0);
    expect(out.wassertyp).toBe("See");
  });
});
