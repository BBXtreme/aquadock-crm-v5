import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ParsedCompanyRow, parseCSVFile, transformToCompanyInsert } from "./csv-import";

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn(),
  },
}));

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
            osm: "n123",
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
});
