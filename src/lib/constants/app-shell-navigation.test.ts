import { describe, expect, it } from "vitest";

import { appShellMarketingNav, appShellQuickCreate, appShellSalesNav } from "./app-shell-navigation";

describe("appShellQuickCreate", () => {
  it("exposes four create deep links with ?create=true", () => {
    expect(appShellQuickCreate).toHaveLength(4);
    for (const item of appShellQuickCreate) {
      expect(item.href).toMatch(/\?create=true$/);
    }
    const paths = new Set(appShellQuickCreate.map((i) => i.href));
    expect(paths.size).toBe(4);
  });

  it("uses distinct messageKey values", () => {
    const keys = appShellQuickCreate.map((i) => i.messageKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("app shell nav", () => {
  it("keeps main nav hrefs unique from each other (sales + marketing)", () => {
    const hrefs = [...appShellSalesNav, ...appShellMarketingNav].map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
