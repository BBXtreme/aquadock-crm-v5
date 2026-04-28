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
});
