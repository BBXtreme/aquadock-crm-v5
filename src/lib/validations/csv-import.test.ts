import { describe, expect, it } from "vitest";
import { parsedCompanyRowSchema, parsedCompanyRowsSchema } from "./csv-import";

describe("parsedCompanyRowSchema", () => {
  it("accepts minimal row", () => {
    const row = { firmenname: "ACME", kundentyp: "marina" };
    expect(parsedCompanyRowSchema.parse(row)).toEqual(row);
  });

  it("accepts optional numeric and geo fields", () => {
    const row = {
      firmenname: "X",
      kundentyp: "hotel",
      wasser_distanz: 1.2,
      lat: 53.5,
      lon: 9.9,
    };
    expect(parsedCompanyRowSchema.parse(row).lat).toBe(53.5);
  });

  it("rejects missing firmenname", () => {
    expect(() => parsedCompanyRowSchema.parse({ firmenname: "", kundentyp: "a" })).toThrow();
  });
});

describe("parsedCompanyRowsSchema", () => {
  it("accepts array", () => {
    const rows = [{ firmenname: "A", kundentyp: "b" }];
    expect(parsedCompanyRowsSchema.parse(rows)).toEqual(rows);
  });
});
