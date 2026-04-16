import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeCsvOsmId,
  type ParsedCompanyRow,
  parseCoordinate,
  parseCSVFile,
  parseGermanFloat,
  stripEmojis,
  transformToCompanyInsert,
} from "./csv-import";

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn(),
  },
}));

describe("parseGermanFloat", () => {
  it("returns undefined for empty string, non-string, or unparseable input", () => {
    expect(parseGermanFloat("")).toBeUndefined();
    expect(parseGermanFloat(null as unknown as string)).toBeUndefined();
    expect(parseGermanFloat(undefined as unknown as string)).toBeUndefined();
    expect(parseGermanFloat(0 as unknown as string)).toBeUndefined();
    expect(parseGermanFloat("not-a-number")).toBeUndefined();
  });

  it("parses German thousands and decimal comma", () => {
    expect(parseGermanFloat("1.234,5")).toBe(1234.5);
    expect(parseGermanFloat("0,25")).toBe(0.25);
    expect(parseGermanFloat("42")).toBe(42);
  });
});

describe("parseCoordinate", () => {
  it("parses dot decimals without mangling", () => {
    expect(parseCoordinate("50.1234", "lat")).toBe(50.1234);
    expect(parseCoordinate("11.576124", "lon")).toBe(11.576124);
    expect(parseCoordinate("48.137154", "lat")).toBe(48.137154);
  });

  it("parses comma decimals", () => {
    expect(parseCoordinate("50,1234", "lat")).toBe(50.1234);
    expect(parseCoordinate("11,576124", "lon")).toBe(11.576124);
  });

  it("parses mixed separators using last decimal separator", () => {
    expect(parseCoordinate("1.234,5", "lat")).toBeUndefined();
    expect(parseCoordinate("1,234.5", "lon")).toBeUndefined();
  });

  it("strips degree symbols and quotes", () => {
    expect(parseCoordinate(`48.137154°`, "lat")).toBe(48.137154);
    expect(parseCoordinate(`11.576124'"`, "lon")).toBe(11.576124);
  });

  it("returns undefined for out of range values", () => {
    expect(parseCoordinate("200", "lat")).toBeUndefined();
    expect(parseCoordinate("181", "lon")).toBeUndefined();
  });

  it("returns undefined for empty, invalid, null, and undefined input", () => {
    expect(parseCoordinate("", "lat")).toBeUndefined();
    expect(parseCoordinate("abc", "lat")).toBeUndefined();
    expect(parseCoordinate(null, "lat")).toBeUndefined();
    expect(parseCoordinate(undefined, "lat")).toBeUndefined();
  });
});

describe("stripEmojis", () => {
  it("returns empty string when input is empty", () => {
    expect(stripEmojis("")).toBe("");
  });

  it("removes common emoji blocks and trims", () => {
    expect(stripEmojis("🌊 See")).toBe("See");
    expect(stripEmojis("Marina ⛵")).toBe("Marina");
  });
});

describe("normalizeCsvOsmId", () => {
  it("normalizes compact OSM ids to lowercase type/id", () => {
    expect(normalizeCsvOsmId("node/12345")).toBe("node/12345");
    expect(normalizeCsvOsmId("Way/987")).toBe("way/987");
    expect(normalizeCsvOsmId("RELATION/42")).toBe("relation/42");
  });

  it("normalizes full openstreetmap URLs to compact type/id", () => {
    expect(normalizeCsvOsmId("https://www.openstreetmap.org/node/12345")).toBe("node/12345");
    expect(normalizeCsvOsmId("https://openstreetmap.org/way/99")).toBe("way/99");
  });

  it("returns undefined for invalid or unsupported OSM values", () => {
    expect(normalizeCsvOsmId("n123")).toBeUndefined();
    expect(normalizeCsvOsmId("https://example.com/node/123")).toBeUndefined();
    expect(normalizeCsvOsmId("https://www.openstreetmap.org/node/abc")).toBeUndefined();
    expect(normalizeCsvOsmId("https://www.openstreetmap.org/changeset/123")).toBeUndefined();
    expect(normalizeCsvOsmId("")).toBeUndefined();
  });
});

describe("parseCSVFile", () => {
  beforeEach(() => {
    vi.mocked(Papa.parse).mockReset();
  });

  it("resolves parsed rows", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          {
            firmenname: "ACME GmbH",
            kundentyp: "Marina",
            land: "DE",
            wassertyp: "🌊 See",
            wasser_distanz: "1.234,5",
            strasse: "Weg 1",
            plz: "20095",
            ort: "Hamburg",
            bundesland: "HH",
            telefon: "040",
            website: "https://x.de",
            email: "a@b.co",
            lat: "53,5",
            lon: "10,1",
            osm: "https://www.openstreetmap.org/node/123",
            unknown_column: "ignored",
          },
          {
            firmenname: "Incomplete Row",
            ignored: "x",
          },
          {
            firmenname: "Alpine Co",
            kundentyp: "Hotel",
            land: "at",
          },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(2);
    const first = rows[0];
    if (first === undefined) {
      throw new Error("expected row");
    }
    expect(first.firmenname).toBe("ACME GmbH");
    expect(first.kundentyp).toBe("marina");
    expect(first.land).toBe("Deutschland");
    expect(first.wassertyp).toBe("See");
    expect(first.lat).toBe(53.5);
    expect(first.lon).toBe(10.1);
    expect(first.osm).toBe("node/123");
    const second = rows[1];
    if (second === undefined) {
      throw new Error("expected second row");
    }
    expect(second.firmenname).toBe("Alpine Co");
    expect(second.kundentyp).toBe("hotel");
    expect(second.land).toBe("Österreich");
  });

  it("rejects on parse errors", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({ errors: [{ message: "bad" }], data: [] });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    await expect(parseCSVFile(file)).rejects.toThrow(/CSV parsing errors/);
  });

  it("rejects on Papa error callback", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as { error: (e: { message: string }) => void };
      opts.error({ message: "fail" });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    await expect(parseCSVFile(file)).rejects.toThrow(/CSV parsing failed/);
  });

  it("passes transformHeader that lowercases and trims column names", async () => {
    let transformHeader: ((h: string) => string) | undefined;
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        transformHeader?: (h: string) => string;
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      transformHeader = opts.transformHeader;
      opts.complete({
        errors: [],
        data: [{ firmenname: "Co", kundentyp: "marina" }],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    await parseCSVFile(file);
    if (transformHeader === undefined) {
      throw new Error("expected transformHeader");
    }
    expect(transformHeader("  FirmenNAME  ")).toBe("firmenname");
  });

  it("aggregates multiple Papa error messages", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [{ message: "first" }, { message: "second" }],
        data: [],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    await expect(parseCSVFile(file)).rejects.toThrow(/CSV parsing errors: first, second/);
  });

  it("normalizes CH land code and keeps unmapped country text", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          { firmenname: "Lake AG", kundentyp: "Marina", land: "ch" },
          { firmenname: "France Co", kundentyp: "Hotel", land: "Frankreich" },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(2);
    const first = rows[0];
    const second = rows[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two rows");
    }
    expect(first.land).toBe("Schweiz");
    expect(second.land).toBe("Frankreich");
  });

  it("drops invalid German-style numbers for distance and coordinates", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          {
            firmenname: "Bad nums GmbH",
            kundentyp: "Sonstige",
            wasser_distanz: "not-a-number",
            lat: "x",
            lon: "",
          },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (row === undefined) {
      throw new Error("expected row");
    }
    expect(row.wasser_distanz).toBeUndefined();
    expect(row.lat).toBeUndefined();
    expect(row.lon).toBeUndefined();
  });

  it("keeps dot-decimal coordinates exact and rejects out-of-range values", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          {
            firmenname: "Dot Decimal GmbH",
            kundentyp: "Hotel",
            lat: "50.1234",
            lon: "11.576124",
          },
          {
            firmenname: "Out of Range GmbH",
            kundentyp: "Hotel",
            lat: "501234",
            lon: "11.576124",
          },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(2);

    const first = rows[0];
    const second = rows[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two rows");
    }

    expect(first.lat).toBe(50.1234);
    expect(first.lon).toBe(11.576124);
    expect(second.lat).toBeUndefined();
    expect(second.lon).toBe(11.576124);
  });

  it("skips empty cells and unknown columns", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          {
            firmenname: "  Trim GmbH  ",
            kundentyp: "  MARINA ",
            website: "   ",
            unknown_column: "ignored",
          },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (row === undefined) {
      throw new Error("expected row");
    }
    expect(row.firmenname).toBe("Trim GmbH");
    expect(row.kundentyp).toBe("marina");
    expect(row.website).toBeUndefined();
  });

  it("maps OSM header aliases and strips invalid OSM values silently", async () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, options: unknown) => {
      const opts = options as {
        complete: (r: { errors: { message: string }[]; data: Record<string, string>[] }) => void;
      };
      opts.complete({
        errors: [],
        data: [
          {
            firmenname: "Alias Co",
            kundentyp: "Hotel",
            osm_id: "https://www.openstreetmap.org/way/456",
          },
          {
            firmenname: "Invalid OSM Co",
            kundentyp: "Hotel",
            openstreetmap: "not-valid",
          },
        ],
      });
    });

    const file = new File([], "x.csv", { type: "text/csv" });
    const rows = await parseCSVFile(file);
    expect(rows).toHaveLength(2);

    const first = rows[0];
    const second = rows[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two rows");
    }

    expect(first.osm).toBe("way/456");
    expect(second.osm).toBeUndefined();
  });
});

describe("transformToCompanyInsert", () => {
  it("maps core fields", () => {
    const row: ParsedCompanyRow = {
      firmenname: "X",
      kundentyp: "hotel",
      lat: 1,
      lon: 2,
      osm: "n1",
    };
    const insert = transformToCompanyInsert(row);
    expect(insert.firmenname).toBe("X");
    expect(insert.kundentyp).toBe("hotel");
    expect(insert.lat).toBe(1);
    expect(insert.lon).toBe(2);
    expect(insert.osm).toBe("n1");
    expect(insert.status).toBe("lead");
  });

  it("maps missing geo fields to null", () => {
    const row: ParsedCompanyRow = {
      firmenname: "Y",
      kundentyp: "lead",
    };
    const insert = transformToCompanyInsert(row);
    expect(insert.lat).toBeNull();
    expect(insert.lon).toBeNull();
    expect(insert.osm).toBeNull();
  });
});
