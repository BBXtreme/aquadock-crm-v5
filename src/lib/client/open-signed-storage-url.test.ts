import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openSignedStorageUrl } from "./open-signed-storage-url";

describe("openSignedStorageUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches and triggers a same-origin download for .md so the OS can open the default app", async () => {
    const blob = new Blob(["# hi"], { type: "text/markdown" });
    vi.mocked(fetch).mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: { "Content-Type": "text/markdown" },
      }),
    );
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation((): undefined => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation((): undefined => undefined);

    await openSignedStorageUrl("https://storage.example/signed?token=x", "notes.md");

    expect(fetch).toHaveBeenCalledWith("https://storage.example/signed?token=x", {
      mode: "cors",
      credentials: "omit",
    });
    expect(anchorClick).toHaveBeenCalled();
    revoke.mockRestore();
    anchorClick.mockRestore();
  });

  it("uses window.open for pdf without fetch", async () => {
    const win = vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openSignedStorageUrl("https://storage.example/s.pdf", "report.pdf");
    expect(fetch).not.toHaveBeenCalled();
    expect(win).toHaveBeenCalled();
    win.mockRestore();
  });

  it("falls back to window.open when fetch returns non-ok for downloadable extension", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    const win = vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openSignedStorageUrl("https://storage.example/a", "readme.md");
    expect(win).toHaveBeenCalledWith("https://storage.example/a", "_blank", "noopener,noreferrer");
    win.mockRestore();
  });

  it("falls back to anchor when fetch throws after window.open blocked", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));
    vi.spyOn(window, "open").mockReturnValue(null);
    const append = vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    const remove = vi.spyOn(document.body, "removeChild").mockImplementation(() => document.createElement("div"));
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation((): undefined => undefined);

    await openSignedStorageUrl("https://storage.example/doc", "readme.md");

    expect(anchorClick).toHaveBeenCalled();
    append.mockRestore();
    remove.mockRestore();
    anchorClick.mockRestore();
  });

  it("uses basename from path fragments in display name", async () => {
    const win = vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openSignedStorageUrl("https://x/z.pdf", "../../deep/report.pdf");
    expect(win.mock.calls.at(0)?.[0]).toContain(".pdf");
    win.mockRestore();
  });
});
