import { describe, expect, it } from "vitest";
import { applyMarkdownSnippet } from "./comment-composer-markdown";

describe("applyMarkdownSnippet", () => {
  it("h2: inserts placeholder heading when nothing selected", () => {
    const { next, focusStart, focusEnd } = applyMarkdownSnippet("ab", 1, 1, "h2");
    expect(next).toBe("a## Heading\nb");
    expect(focusStart).toBe(4);
    expect(focusEnd).toBeGreaterThan(focusStart);
  });

  it("h2: wraps selection as heading", () => {
    const { next, focusStart, focusEnd } = applyMarkdownSnippet("aXb", 1, 2, "h2");
    expect(next).toContain("## X\n");
    expect(focusStart).toBe(4);
    expect(focusEnd).toBe(5);
  });

  it("bold / italic / code / link use defaults when selection empty", () => {
    expect(applyMarkdownSnippet("x", 1, 1, "bold").next).toContain("**bold text**");
    expect(applyMarkdownSnippet("x", 1, 1, "italic").next).toContain("_italic text_");
    expect(applyMarkdownSnippet("x", 1, 1, "code").next).toContain("`code`");
    expect(applyMarkdownSnippet("x", 1, 1, "link").next).toContain("[link text](url)");
  });

  it("bold wraps selected text", () => {
    const { next, focusStart, focusEnd } = applyMarkdownSnippet("aHi b", 1, 3, "bold");
    expect(next).toBe("a**Hi** b");
    expect(next.slice(focusStart, focusEnd)).toBe("Hi");
  });

  it("codeBlock wraps selection or newline placeholder", () => {
    const empty = applyMarkdownSnippet("z", 0, 0, "codeBlock");
    expect(empty.next).toContain("```");
    const sel = applyMarkdownSnippet("z", 0, 1, "codeBlock");
    expect(sel.next).toContain("z");
  });

  it("bullet / ordered / task differ for empty vs selected selection", () => {
    const b0 = applyMarkdownSnippet("z", 0, 0, "bullet");
    expect(b0.next).toBe("- \nz");
    expect(b0.focusEnd).toBe(b0.focusStart);

    const b1 = applyMarkdownSnippet("z", 0, 1, "bullet");
    expect(b1.next).toBe("- z\n");
    expect(b1.focusEnd).toBeGreaterThan(b1.focusStart);

    const o0 = applyMarkdownSnippet("z", 0, 0, "ordered");
    expect(o0.next).toBe("1. \nz");

    const o1 = applyMarkdownSnippet("z", 0, 1, "ordered");
    expect(o1.next).toBe("1. z\n");
    expect(o1.focusEnd).toBeGreaterThan(o1.focusStart);

    const t0 = applyMarkdownSnippet("z", 0, 0, "task");
    expect(t0.next).toBe("- [ ] \nz");

    const t1 = applyMarkdownSnippet("z", 0, 1, "task");
    expect(t1.next).toBe("- [ ] z\n");
    expect(t1.focusEnd).toBeGreaterThan(t1.focusStart);
  });

  it("falls back to unchanged value for unknown snippet keys", () => {
    const r = applyMarkdownSnippet(
      "abc",
      1,
      2,
      "not-a-snippet" as unknown as Parameters<typeof applyMarkdownSnippet>[3],
    );
    expect(r).toEqual({ next: "abc", focusStart: 1, focusEnd: 2 });
  });
});
