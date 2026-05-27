import { describe, expect, it } from "vitest";
import { isValidCvStoragePath } from "./storage";

describe("isValidCvStoragePath", () => {
  it("accepts tmp and applications prefixes", () => {
    expect(isValidCvStoragePath("tmp/uuid/cv.pdf")).toBe(true);
    expect(isValidCvStoragePath("applications/uuid/cv.pdf")).toBe(true);
  });

  it("rejects path traversal and unknown prefixes", () => {
    expect(isValidCvStoragePath("../etc/passwd")).toBe(false);
    expect(isValidCvStoragePath("tmp/../secret")).toBe(false);
    expect(isValidCvStoragePath("public/cv.pdf")).toBe(false);
    expect(isValidCvStoragePath("")).toBe(false);
  });
});
