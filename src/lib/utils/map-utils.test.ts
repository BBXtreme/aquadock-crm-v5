/**
 * Tests for OpenMap/geo utilities: {@link ./map-utils.ts}, {@link ./calculateWaterDistance.ts},
 * plus {@link ../constants/map-status-colors.ts}, {@link ../constants/map-poi-config.ts}, {@link ../constants/wassertyp.ts}.
 */

import L from "leaflet";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { badgeColors, statusColors } from "@/lib/constants/map-status-colors";
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
  it.each(Object.entries(statusColors))("maps every CRM status %s to its statusColors entry", (status, color) => {
    const icon = getStatusIcon(status);
    const html = typeof icon.options.html === "string" ? icon.options.html : "";
    expect(html).toContain(`background-color:${color}`);
    const letter = status.charAt(0).toUpperCase();
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

  it("uses lead color for empty string status and shows ?", () => {
    const icon = getStatusIcon("");
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

describe("badgeColors (POI / category map marker palette)", () => {
  it("extends status colors with OpenMap POI category keys", () => {
    expect(badgeColors.marina).toBe(statusColors.akquise);
    expect(badgeColors.restaurant).toBe(statusColors.lead);
    expect(badgeColors.camping).toBe(statusColors.angebot);
    expect(badgeColors.bootsverleih).toBe(statusColors.gewonnen);
    expect(badgeColors.segelschule).toBe(statusColors.kunde);
    expect(badgeColors.resort).toBe(statusColors.partner);
    expect(badgeColors.sonstige).toBe(statusColors.inaktiv);
    expect(badgeColors.hotel).toBe(statusColors.qualifiziert);
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
  it.each(Object.entries(poiCategories))("category %s has icon, label, and non-empty OSM tags", (_key, cfg) => {
    expect(cfg.icon.length).toBeGreaterThan(0);
    expect(cfg.name.length).toBeGreaterThan(0);
    expect(cfg.tags.length).toBeGreaterThan(0);
  });

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

  it("uses bare amenity-style tags without = for restaurant and ferry", () => {
    expect(poiCategories.restaurant.tags).toContain("restaurant");
    expect(poiCategories.restaurant.tags.every((t) => !t.includes("="))).toBe(true);
    expect(poiCategories.ferry.tags).toEqual(["ferry_terminal"]);
  });

  it("includes leisure= and sport= style tags for club and rowing", () => {
    expect(poiCategories.club.tags.some((t) => t.startsWith("leisure="))).toBe(true);
    expect(poiCategories.rowing.tags).toContain("sport=rowing");
  });
});

describe("determineWassertyp", () => {
  it("maps waterway river to Fluss", () => {
    expect(determineWassertyp({ waterway: "river" })).toBe("Fluss");
  });

  it("maps stream and canal values", () => {
    expect(determineWassertyp({ waterway: "stream" })).toBe("Bach");
    expect(determineWassertyp({ waterway: "canal" })).toBe("Kanal");
  });

  it("maps harbour-like waterways to Hafen", () => {
    expect(determineWassertyp({ waterway: "dock" })).toBe("Hafen");
    expect(determineWassertyp({ waterway: "harbour" })).toBe("Hafen");
    expect(determineWassertyp({ waterway: "marina" })).toBe("Hafen");
  });

  it("maps natural water lake to See", () => {
    expect(determineWassertyp({ natural: "water", water: "lake" })).toBe("See");
  });

  it("maps coastal natural values", () => {
    expect(determineWassertyp({ natural: "bay" })).toBe("Küste / Meer");
    expect(determineWassertyp({ natural: "beach" })).toBe("Küste / Meer");
  });

  it("returns null when no tag value matches WASSERTYP_MAP", () => {
    expect(determineWassertyp({ foo: "bar" })).toBeNull();
  });

  it("returns null for empty tags", () => {
    expect(determineWassertyp({})).toBeNull();
  });

  it("handles undefined-like empty tag object safely", () => {
    expect(determineWassertyp(Object.create(null) as Record<string, string>)).toBeNull();
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
    expect(finiteLatLon("  53.5  ")).toBe(53.5);
    expect(finiteLatLon("")).toBeNull();
    expect(finiteLatLon("   ")).toBeNull();
    expect(finiteLatLon("x")).toBeNull();
    expect(finiteLatLon(Number.NaN)).toBeNull();
    expect(finiteLatLon(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rejects null and undefined for finiteLatLon", () => {
    expect(finiteLatLon(null)).toBeNull();
    expect(finiteLatLon(undefined)).toBeNull();
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

  it("treats missing elements array in Overpass JSON as empty", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const bounds = L.latLngBounds(L.latLng(53, 8), L.latLng(54, 9));
    const promise = fetchOsmPois(bounds, ["marina"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
  });

  it("preserves POIs that only have center (no lat/lon) and omits tags safely", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          { type: "way", id: 99, center: { lat: 53.08, lon: 8.81 } },
          { type: "node", id: 100, lat: 53.09, lon: 8.82 },
        ],
      }),
    } as Response);

    const bounds = L.latLngBounds(L.latLng(53, 8), L.latLng(54, 9));
    const promise = fetchOsmPois(bounds, ["hotel"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toHaveLength(2);
    expect(result.pois[0]?.tags).toBeUndefined();
    expect(result.pois[0]?.center).toEqual({ lat: 53.08, lon: 8.81 });
  });

  it("retries on HTTP 429 then succeeds after backoff", async () => {
    let calls = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 429 } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [{ type: "node", id: 7, lat: 53, lon: 8, tags: { amenity: "cafe" } }],
        }),
      } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(52.9, 7.9), L.latLng(53.1, 8.1));
    const promise = fetchOsmPois(bounds, ["restaurant"]);
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(2500);
    const result = await promise;

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(result.pois).toHaveLength(1);
    expect(result.totalFound).toBe(1);
  });

  it("stops retrying current mirror on HTTP 504", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 504,
      statusText: "Gateway Timeout",
    } as Response);

    const bounds = L.latLngBounds(L.latLng(51, 6), L.latLng(52, 7));
    const promise = fetchOsmPois(bounds, ["rowing"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
  });

  it("falls through to a later Overpass mirror when the first returns 403", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("overpass-api.de")) {
        return { ok: false, status: 403 } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [{ type: "node", id: 3, lat: 50.1, lon: 5.2 }],
        }),
      } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(50, 5), L.latLng(51, 6));
    const promise = fetchOsmPois(bounds, ["camping"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toHaveLength(1);
    const attemptedUrls = vi.mocked(globalThis.fetch).mock.calls.map((c) => String(c[0]));
    expect(attemptedUrls.some((u) => u.includes("private.coffee"))).toBe(true);
  });

  it("resolves empty when the last mirror throws and initial retryCount is already high", async () => {
    const last = OVERPASS_ENDPOINTS[OVERPASS_ENDPOINTS.length - 1];
    if (last === undefined) {
      throw new Error("expected OVERPASS_ENDPOINTS to be non-empty");
    }

    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith(last)) {
        return Promise.reject(new Error("network down"));
      }
      return { ok: false, status: 403 } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(49, 4), L.latLng(50, 5));
    const promise = fetchOsmPois(bounds, ["camping"], 2);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
  });

  it("resolves empty from catch when last mirror rejects a non-Error with high retryCount", async () => {
    const last = OVERPASS_ENDPOINTS[OVERPASS_ENDPOINTS.length - 1];
    if (last === undefined) {
      throw new Error("expected OVERPASS_ENDPOINTS to be non-empty");
    }

    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith(last)) {
        throw "last-mirror-string-rejection";
      }
      return { ok: false, status: 403 } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(49.1, 4.1), L.latLng(50.1, 5.1));
    const promise = fetchOsmPois(bounds, ["camping"], 2);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toEqual([]);
    expect(result.totalFound).toBe(0);
  });

  it("skips to the next mirror when fetch aborts on a non-final endpoint", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("overpass-api.de")) {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [{ type: "node", id: 88, lat: 48.2, lon: 11.5, tags: { amenity: "restaurant" } }],
        }),
      } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(48.1, 11.4), L.latLng(48.3, 11.6));
    const promise = fetchOsmPois(bounds, ["restaurant"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]?.id).toBe(88);
  });

  it("continues to a subsequent mirror when fetch rejects with a non-Error value", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("overpass-api.de")) {
        throw "network-string-rejection";
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [{ type: "node", id: 501, lat: 52.1, lon: 8.2, tags: { tourism: "hotel" } }],
        }),
      } as Response;
    });

    const bounds = L.latLngBounds(L.latLng(52.0, 8.1), L.latLng(52.2, 8.3));
    const promise = fetchOsmPois(bounds, ["hotel"]);
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;

    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]?.id).toBe(501);
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

  it("returns a small realistic distance for Hamburg coordinates with nearby river geometry", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          {
            type: "way",
            id: 501,
            tags: { waterway: "river" },
            geometry: [{ lat: 53.552, lon: 9.993682 }],
          },
        ],
      }),
    } as Response);

    const lat = 53.551_086;
    const lon = 9.993_682;
    const out = await calculateWaterDistance(lat, lon);
    expect(out.wassertyp).toBe("Fluss");
    expect(out.distance).not.toBeNull();
    if (out.distance !== null) {
      expect(out.distance).toBeGreaterThan(50);
      expect(out.distance).toBeLessThan(250);
    }
  });

  it("returns null distance when geometry uses 0/0 (truthy check skips coordinates)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          {
            type: "way",
            id: 502,
            tags: { natural: "water", water: "lake" },
            geometry: [{ lat: 0, lon: 0 }],
          },
        ],
      }),
    } as Response);

    const out = await calculateWaterDistance(-33.0, 18.0);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });

  it("ignores invalid water cache JSON and still calls Overpass", async () => {
    localStorage.setItem("aquadock_water_cache_v2", "{not-json");
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: [] }),
    } as Response);

    await calculateWaterDistance(48.13, 11.57);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("returns null when every Overpass POST and fallback fail", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Unavailable",
    } as Response);

    const out = await calculateWaterDistance(46.95, 7.45);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });

  it("continues to the next mirror after a non-429 HTTP error from primary POST", async () => {
    let primaryPosts = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("is_in(")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] }),
        } as Response;
      }
      if (!body.includes("nwr(around")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] }),
        } as Response;
      }
      primaryPosts += 1;
      if (primaryPosts === 1) {
        return { ok: false, status: 502, statusText: "Bad Gateway" } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              type: "way",
              id: 801,
              tags: { waterway: "river" },
              geometry: [{ lat: 51.12, lon: 6.95 }],
            },
          ],
        }),
      } as Response;
    });

    const out = await calculateWaterDistance(51.0, 7.0);
    expect(primaryPosts).toBeGreaterThanOrEqual(2);
    expect(out.wassertyp).toBe("Fluss");
    expect(out.distance).not.toBeNull();
  });

  it("waits after HTTP 429 before trying the next primary mirror", async () => {
    vi.useFakeTimers();
    try {
      let primaryPosts = 0;
      vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = typeof init?.body === "string" ? init.body : "";
        if (body.includes("is_in(")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ elements: [] }),
          } as Response;
        }
        if (!body.includes("nwr(around")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ elements: [] }),
          } as Response;
        }
        primaryPosts += 1;
        if (primaryPosts === 1) {
          return { ok: false, status: 429, statusText: "Too Many" } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              {
                type: "way",
                id: 802,
                tags: { natural: "water", water: "lake" },
                geometry: [{ lat: 49.01, lon: 10.51 }],
              },
            ],
          }),
        } as Response;
      });

      const p = calculateWaterDistance(49.0, 10.5);
      await vi.advanceTimersByTimeAsync(850);
      const out = await p;
      expect(primaryPosts).toBeGreaterThanOrEqual(2);
      expect(out.distance).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops primary mirror loop on AbortError and still runs is_in fallback", async () => {
    let primaryPosts = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("is_in(")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] }),
        } as Response;
      }
      if (!body.includes("nwr(around")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] }),
        } as Response;
      }
      primaryPosts += 1;
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });

    const out = await calculateWaterDistance(50.2, 10.8);
    expect(primaryPosts).toBe(1);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });

  it("ignores expired water cache entries and refetches Overpass", async () => {
    const lat = 47.5;
    const lon = 8.3;
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const stale = {
      [key]: {
        distance: 99,
        wassertyp: "See",
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
      },
    };
    localStorage.setItem("aquadock_water_cache_v2", JSON.stringify(stale));

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: [] }),
    } as Response);

    await calculateWaterDistance(lat, lon);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("returns null when is_in fallback fetch rejects", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("is_in(")) {
        return Promise.reject(new Error("fallback transport"));
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      } as Response;
    });

    const out = await calculateWaterDistance(54.2, 12.5);
    expect(out.distance).toBeNull();
    expect(out.wassertyp).toBeNull();
  });
});
