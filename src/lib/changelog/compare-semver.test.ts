import { describe, expect, it } from "vitest";

import { compareSemver, parseSemver } from "./compare-semver";

describe("parseSemver", () => {
  it("parses valid triples", () => {
    expect(parseSemver("0.5.45")).toEqual([0, 5, 45]);
    expect(parseSemver("1.10.0")).toEqual([1, 10, 0]);
  });

  it("returns null for wrong part count", () => {
    expect(parseSemver("1.0")).toBeNull();
    expect(parseSemver("1.0.0.1")).toBeNull();
  });

  it("returns null for non-numeric parts", () => {
    expect(parseSemver("a.0.0")).toBeNull();
    expect(parseSemver("1.x.0")).toBeNull();
  });

  it("rejects empty segments", () => {
    expect(parseSemver("1..0")).toBeNull();
  });
});

describe("compareSemver", () => {
  it("orders major", () => {
    expect(compareSemver("1.0.0", "0.9.9")).toBe(1);
    expect(compareSemver("0.9.9", "1.0.0")).toBe(-1);
  });

  it("orders minor", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBe(1);
    expect(compareSemver("0.9.0", "0.10.0")).toBe(-1);
  });

  it("orders patch", () => {
    expect(compareSemver("0.5.2", "0.5.1")).toBe(1);
    expect(compareSemver("0.5.1", "0.5.2")).toBe(-1);
  });

  it("returns 0 for equal versions", () => {
    expect(compareSemver("0.5.45", "0.5.45")).toBe(0);
  });

  it("returns null when either operand is invalid", () => {
    expect(compareSemver("1.0", "1.0.0")).toBeNull();
    expect(compareSemver("1.0.0", "v1.0.0")).toBeNull();
  });

  it("handles multi-digit numeric comparison", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBe(1);
  });
});
