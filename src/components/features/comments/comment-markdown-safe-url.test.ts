import { afterEach, describe, expect, it, vi } from "vitest";
import { safeUrl } from "./CommentMarkdownPreview";

class UrlParseThrows extends URL {
  constructor(input: string | URL, base?: string | URL) {
    void input;
    void base;
    super("https://example.com/");
    throw new Error("invalid");
  }
}

function spyUrlThrowsOnce() {
  return vi.spyOn(globalThis, "URL").mockImplementationOnce(UrlParseThrows as unknown as typeof URL);
}

describe("safeUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows http(s), mailto, and tel schemes", () => {
    expect(safeUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(safeUrl("http://example.com/x")).toBe("http://example.com/x");
    expect(safeUrl("mailto:a@b.co")).toBe("mailto:a@b.co");
    expect(safeUrl("tel:+491234")).toBe("tel:+491234");
  });

  it("strips unsafe schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
  });

  it("when URL parsing throws, keeps hash and path prefixes only", () => {
    spyUrlThrowsOnce();
    expect(safeUrl("#frag")).toBe("#frag");

    spyUrlThrowsOnce();
    expect(safeUrl("/relative")).toBe("/relative");

    spyUrlThrowsOnce();
    expect(safeUrl("nope")).toBe("");
  });
});
