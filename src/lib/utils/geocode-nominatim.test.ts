/**
 * Unit tests for {@link ./geocode-nominatim.ts}.
 *
 * The Nominatim helper is a pure(ish) wrapper around a single `fetch` call.
 * We mock `fetch` and exhaustively cover:
 *   - address-completeness gate (INCOMPLETE_ADDRESS)
 *   - in-memory cache hits / misses (including caching of failures)
 *   - network failure (thrown) and non-2xx responses (NETWORK_ERROR)
 *   - empty / malformed JSON (NO_RESULT)
 *   - out-of-range and non-finite coordinates (INVALID_COORDINATE)
 *   - confidence mapping (high / medium / low / boundaries)
 *   - the mandatory User-Agent and required query parameters
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type GeocodeAddressResult,
  geocodeAddress,
  NOMINATIM_USER_AGENT,
} from "./geocode-nominatim";

type FetchSpy = ReturnType<typeof vi.fn>;

function makeResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function emptyCache(): Map<string, GeocodeAddressResult> {
  return new Map<string, GeocodeAddressResult>();
}

let fetchMock: FetchSpy;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("geocodeAddress - address completeness", () => {
  it("returns INCOMPLETE_ADDRESS when Stadt is missing", async () => {
    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: null, land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INCOMPLETE_ADDRESS");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns INCOMPLETE_ADDRESS when both Strasse and PLZ are missing", async () => {
    const result = await geocodeAddress(
      { strasse: null, plz: null, stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INCOMPLETE_ADDRESS");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds when Stadt + Strasse are present (PLZ missing is OK)", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.8, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Marienplatz", plz: null, stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("proceeds when Stadt + PLZ are present (Strasse missing is OK)", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.5, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: null, plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats whitespace-only fields as missing", async () => {
    const result = await geocodeAddress(
      { strasse: "   ", plz: "   ", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INCOMPLETE_ADDRESS");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("geocodeAddress - cache", () => {
  it("caches successful results and does not re-issue fetch for the same address", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.9, display_name: "X" }]),
    );
    const cache = emptyCache();
    const input = { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" };

    const first = await geocodeAddress(input, cache);
    const second = await geocodeAddress(input, cache);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches failure results too (to avoid hammering Nominatim on known-bad addresses)", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse([]));
    const cache = emptyCache();
    const input = { strasse: "Nonexistent 999", plz: "00000", stadt: "Nowhere", land: "DE" };

    const first = await geocodeAddress(input, cache);
    const second = await geocodeAddress(input, cache);

    expect(first.ok).toBe(false);
    expect(first.reason).toBe("NO_RESULT");
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is case-insensitive in the cache key", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.9, display_name: "X" }]),
    );
    const cache = emptyCache();

    await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      cache,
    );
    await geocodeAddress(
      { strasse: "HAUPTSTR. 1", plz: "80331", stadt: "MÜNCHEN", land: "de" },
      cache,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("geocodeAddress - network and response errors", () => {
  it("returns NETWORK_ERROR when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NETWORK_ERROR");
  });

  it("returns NETWORK_ERROR on non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({}, { ok: false, status: 503 }));

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NETWORK_ERROR");
  });

  it("returns NETWORK_ERROR when the body cannot be parsed as JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response);

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NETWORK_ERROR");
  });

  it("returns NO_RESULT when Nominatim returns an empty array", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse([]));

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NO_RESULT");
  });

  it("returns NO_RESULT when the first hit has no lat/lon fields", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse([{ importance: 0.5, display_name: "X" }]));

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NO_RESULT");
  });
});

describe("geocodeAddress - coordinate validation", () => {
  it("returns INVALID_COORDINATE when lat/lon are not parseable", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "not-a-number", lon: "11.575", importance: 0.5 }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_COORDINATE");
  });

  it("returns INVALID_COORDINATE when lat is out of range", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "91.0", lon: "11.575", importance: 0.5 }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_COORDINATE");
  });

  it("returns INVALID_COORDINATE when lon is out of range", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "181.0", importance: 0.5 }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_COORDINATE");
  });

  it("accepts boundary coordinates (90 / -90 / 180 / -180)", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "90", lon: "-180", importance: 0.5, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(true);
    expect(result.lat).toBe(90);
    expect(result.lon).toBe(-180);
  });
});

describe("geocodeAddress - confidence mapping", () => {
  it("maps importance > 0.7 to 'high'", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.85, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.confidence).toBe("high");
  });

  it("maps 0.4 <= importance <= 0.7 to 'medium'", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.4, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.confidence).toBe("medium");
  });

  it("maps importance < 0.4 to 'low'", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.1, display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.confidence).toBe("low");
  });

  it("treats a missing importance as 0 → 'low'", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", display_name: "X" }]),
    );

    const result = await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(result.ok).toBe(true);
    expect(result.importance).toBe(0);
    expect(result.confidence).toBe("low");
  });
});

describe("geocodeAddress - request shape", () => {
  it("sends the mandatory User-Agent and structured query parameters", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.9, display_name: "X" }]),
    );

    await geocodeAddress(
      { strasse: "Hauptstr. 1", plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [rawUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(rawUrl).toContain("https://nominatim.openstreetmap.org/search");
    const url = new URL(rawUrl);
    expect(url.searchParams.get("street")).toBe("Hauptstr. 1");
    expect(url.searchParams.get("postalcode")).toBe("80331");
    expect(url.searchParams.get("city")).toBe("München");
    expect(url.searchParams.get("countrycodes")).toBe("de");
    expect(url.searchParams.get("country")).toBeNull();
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.get("addressdetails")).toBe("1");

    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe(NOMINATIM_USER_AGENT);
    expect(headers.Accept).toBe("application/json");
    expect(init.cache).toBe("no-store");
  });

  it("omits the 'street' query param when Strasse is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "48.137", lon: "11.575", importance: 0.5, display_name: "X" }]),
    );

    await geocodeAddress(
      { strasse: null, plz: "80331", stadt: "München", land: "DE" },
      emptyCache(),
    );

    const [rawUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(rawUrl);
    expect(url.searchParams.has("street")).toBe(false);
    expect(url.searchParams.get("postalcode")).toBe("80331");
  });

  it("uses lowercase ISO countrycodes when land is an alpha-2 code", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse([{ lat: "45.81", lon: "15.98", importance: 0.5, display_name: "Zagreb" }]),
    );

    await geocodeAddress(
      { strasse: "Trg bana Jelačića 1", plz: "10000", stadt: "Zagreb", land: "HR" },
      emptyCache(),
    );

    const [rawUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(rawUrl);
    expect(url.searchParams.get("countrycodes")).toBe("hr");
    expect(url.searchParams.get("country")).toBeNull();
  });
});
