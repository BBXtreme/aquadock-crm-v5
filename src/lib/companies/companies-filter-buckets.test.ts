import { describe, expect, it } from "vitest";
import {
  COMPANIES_FILTER_BUCKET_KEYS,
  companiesFilterBucketsFromRpcData,
  nonEmptyStringsFromJson,
} from "./companies-filter-buckets";

describe("nonEmptyStringsFromJson", () => {
  it("returns empty set for non-array", () => {
    expect(nonEmptyStringsFromJson(null)).toEqual(new Set());
    expect(nonEmptyStringsFromJson(undefined)).toEqual(new Set());
    expect(nonEmptyStringsFromJson("x")).toEqual(new Set());
    expect(nonEmptyStringsFromJson({})).toEqual(new Set());
  });

  it("keeps only non-empty strings", () => {
    expect(nonEmptyStringsFromJson(["a", "", "b", 1, null, " "])).toEqual(new Set(["a", "b", " "]));
  });
});

describe("companiesFilterBucketsFromRpcData", () => {
  it("returns empty buckets for nullish or non-object payload", () => {
    for (const data of [null, undefined, "x", 42]) {
      const out = companiesFilterBucketsFromRpcData(data);
      for (const key of COMPANIES_FILTER_BUCKET_KEYS) {
        expect(out[key].size).toBe(0);
      }
    }
  });

  it("fills each bucket from RPC keys", () => {
    const out = companiesFilterBucketsFromRpcData({
      status: ["lead", ""],
      kundentyp: ["a"],
      firmentyp: [],
      land: ["DE", "HR"],
      wassertyp: ["x"],
      extraIgnored: ["z"],
    });
    expect([...out.status]).toEqual(["lead"]);
    expect([...out.kundentyp]).toEqual(["a"]);
    expect([...out.firmentyp]).toEqual([]);
    expect([...out.land].sort()).toEqual(["DE", "HR"]);
    expect([...out.wassertyp]).toEqual(["x"]);
  });
});
