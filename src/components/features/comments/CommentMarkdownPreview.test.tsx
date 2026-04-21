import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommentMarkdownPreview } from "./CommentMarkdownPreview";

describe("CommentMarkdownPreview", () => {
  it("renders em dash placeholder when markdown is empty", () => {
    render(<CommentMarkdownPreview markdown="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders em dash when markdown is whitespace-only", () => {
    const md = `${"   "}${"\n\t"}`;
    expect(md.trim()).toBe("");
    render(<CommentMarkdownPreview markdown={md} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders markdown body when there is content", () => {
    render(<CommentMarkdownPreview markdown="Hello **world**" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("renders relative and hash links from urlTransform catch path", () => {
    const { container } = render(<CommentMarkdownPreview markdown="[h](/path-only) [x](#frag)" />);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/path-only");
    expect(hrefs).toContain("#frag");
  });

  it("keeps safe http(s) links and strips unsafe javascript URLs", () => {
    const { container } = render(
      <CommentMarkdownPreview markdown="[ok](https://example.com) [bad](javascript:alert(1)) [hash](#x) [rel](/p)" />,
    );
    const links = container.querySelectorAll("a");
    const hrefs = [...links].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://example.com");
    expect(hrefs.some((h) => h?.startsWith("javascript:"))).toBe(false);
    expect(hrefs).toContain("#x");
    expect(hrefs).toContain("/p");
  });
});
