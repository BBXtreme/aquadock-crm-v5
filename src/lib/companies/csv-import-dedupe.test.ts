import { describe, expect, it } from "vitest";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import {
  analyzeInternalDuplicates,
  buildFirmennameOrFilter,
  buildWebsiteOrFilter,
  collectDedupeQueryBuckets,
  countImportableRowsWithForce,
  findDbDuplicateForRow,
  mergeDuplicateAnalyses,
  normalizeCity,
  normalizeCompanyName,
  normalizePlz,
  normalizeWebsiteHost,
  rowNeedsDuplicateReview,
  withinFileDedupeKey,
} from "./csv-import-dedupe";

function row(partial: Partial<ParsedCompanyRow> & Pick<ParsedCompanyRow, "firmenname" | "kundentyp">): ParsedCompanyRow {
  return {
    firmenname: partial.firmenname,
    kundentyp: partial.kundentyp,
    wasser_distanz: partial.wasser_distanz,
    wassertyp: partial.wassertyp,
    strasse: partial.strasse,
    plz: partial.plz,
    ort: partial.ort,
    bundesland: partial.bundesland,
    land: partial.land,
    telefon: partial.telefon,
    website: partial.website,
    email: partial.email,
    lat: partial.lat,
    lon: partial.lon,
    osm: partial.osm,
  };
}

describe("csv-import-dedupe normalizers", () => {
  it("normalizeCompanyName lowercases and strips punctuation noise", () => {
    expect(normalizeCompanyName(`  ACME "GmbH"  `)).toBe("acme gmbh");
  });

  it("normalizePlz strips spaces", () => {
    expect(normalizePlz(" 80 123 ")).toBe("80123");
  });

  it("normalizeCity lowercases", () => {
    expect(normalizeCity("  München ")).toBe("münchen");
  });

  it("normalizeWebsiteHost strips www", () => {
    expect(normalizeWebsiteHost("https://WWW.Example.COM/path")).toBe("example.com");
    expect(normalizeWebsiteHost("cafe.de")).toBe("cafe.de");
  });
});

describe("findDbDuplicateForRow", () => {
  const existing = {
    id: "10000000-0000-4000-8000-000000000001",
    firmenname: "Acme GmbH",
    stadt: "München",
    plz: "80331",
    website: "https://www.acme.com/about",
    osm: "node/123",
  };

  it("matches OSM tier", () => {
    const csv = row({
      firmenname: "Other",
      kundentyp: "restaurant",
      osm: "node/123",
    });
    const m = findDbDuplicateForRow(csv, [existing]);
    expect(m?.tier).toBe("osm");
    expect(m?.existing.id).toBe(existing.id);
  });

  it("matches website tier", () => {
    const csv = row({
      firmenname: "Other",
      kundentyp: "restaurant",
      website: "https://acme.com",
    });
    const m = findDbDuplicateForRow(csv, [existing]);
    expect(m?.tier).toBe("website");
  });

  it("matches name + plz + city tier", () => {
    const csv = row({
      firmenname: "Acme GmbH",
      kundentyp: "restaurant",
      plz: "80331",
      ort: "München",
    });
    const m = findDbDuplicateForRow(csv, [existing]);
    expect(m?.tier).toBe("name_plz_city");
  });

  it("matches name_only when plz or city missing on CSV", () => {
    const csv = row({
      firmenname: "Acme GmbH",
      kundentyp: "restaurant",
      ort: "München",
    });
    const m = findDbDuplicateForRow(csv, [existing]);
    expect(m?.tier).toBe("name_only");
  });

  it("returns null when no match", () => {
    const csv = row({
      firmenname: "Totally Different AG",
      kundentyp: "restaurant",
      plz: "10115",
      ort: "Berlin",
    });
    expect(findDbDuplicateForRow(csv, [existing])).toBeNull();
  });
});

describe("analyzeInternalDuplicates", () => {
  it("marks second and later rows with same key", () => {
    const rows = [
      row({ firmenname: "A", kundentyp: "x", website: "https://a.de" }),
      row({ firmenname: "B", kundentyp: "x", website: "https://a.de" }),
      row({ firmenname: "C", kundentyp: "x", website: "https://b.de" }),
    ];
    const m = analyzeInternalDuplicates(rows);
    expect(m.get(1)).toEqual({ firstRowIndex: 0 });
    expect(m.has(0)).toBe(false);
    expect(m.has(2)).toBe(false);
  });
});

describe("mergeDuplicateAnalyses and rowNeedsDuplicateReview", () => {
  it("flags db or internal", () => {
    const analyses = mergeDuplicateAnalyses(
      2,
      new Map([[0, { tier: "osm", existing: { id: "x", firmenname: "A", stadt: null, plz: null, website: null, osm: "n/1" } }]]),
      new Map([[1, { firstRowIndex: 0 }]]),
    );
    expect(analyses.map(rowNeedsDuplicateReview)).toEqual([true, true]);
  });
});

describe("collectDedupeQueryBuckets", () => {
  it("collects distinct buckets", () => {
    const rows = [
      row({ firmenname: "A", kundentyp: "x", osm: "way/1", plz: "1", website: "https://x.de" }),
      row({ firmenname: "B", kundentyp: "x", osm: "way/1", plz: "2", ort: "Y" }),
    ];
    const b = collectDedupeQueryBuckets(rows);
    expect(b.osms).toEqual(["way/1"]);
    expect(b.plzs.sort()).toEqual(["1", "2"]);
    expect(b.hosts).toContain("x.de");
  });
});

describe("buildWebsiteOrFilter", () => {
  it("joins ilike clauses", () => {
    expect(buildWebsiteOrFilter(["a.de", "b.de"])).toBe("website.ilike.%a.de%,website.ilike.%b.de%");
  });

  it("escapes ilike wildcards", () => {
    expect(buildWebsiteOrFilter(["100%_evil.com"])).toContain("\\%");
  });
});

describe("buildFirmennameOrFilter", () => {
  it("joins firmenname ilike clauses", () => {
    expect(buildFirmennameOrFilter(["acme", "foo"])).toBe("firmenname.ilike.%acme%,firmenname.ilike.%foo%");
  });
});

describe("withinFileDedupeKey", () => {
  it("is stable for same row content", () => {
    const r = row({ firmenname: "A", kundentyp: "x", plz: "1", ort: "B" });
    expect(withinFileDedupeKey(r, 0)).toBe(withinFileDedupeKey(r, 99));
  });
});

describe("countImportableRowsWithForce", () => {
  it("counts non-review rows and forced review rows", () => {
    const analyses = mergeDuplicateAnalyses(
      3,
      new Map([
        [0, { tier: "osm", existing: { id: "x", firmenname: "A", stadt: null, plz: null, website: null, osm: "n/1" } }],
      ]),
      new Map([[2, { firstRowIndex: 1 }]]),
    );
    expect(countImportableRowsWithForce(analyses, new Set())).toBe(1);
    expect(countImportableRowsWithForce(analyses, new Set([0, 2]))).toBe(3);
    expect(countImportableRowsWithForce(analyses, new Set([0, 2]), new Set([1]))).toBe(2);
  });
});
