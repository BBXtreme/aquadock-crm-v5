import { describe, expect, it } from "vitest";
import {
  contactsColumnVisibilityEqual,
  defaultContactsColumnVisibility,
  hasContactsColumnsParam,
  mergeContactsColumnsIntoPath,
  mergeSessionContactsColumnsIntoPath,
  parseContactsColumnVisibility,
  serializeContactsColumnVisibility,
} from "./contacts-columns-url-state";

describe("contacts columns url state", () => {
  it("uses default visibility when cols param is absent", () => {
    const parsed = parseContactsColumnVisibility(new URLSearchParams());
    expect(parsed).toEqual(defaultContactsColumnVisibility());
  });

  it("parses serialized visibility state", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "anrede:1,email:0");
    const parsed = parseContactsColumnVisibility(sp);
    expect(parsed).toEqual({ anrede: true, email: false });
  });

  it("serializes visibility state deterministically", () => {
    const serialized = serializeContactsColumnVisibility({ email: false, anrede: true });
    expect(serialized).toBe("anrede:1,email:0");
  });

  it("checks equality independent of object key order", () => {
    expect(
      contactsColumnVisibilityEqual({ anrede: true, email: false }, { email: false, anrede: true }),
    ).toBe(true);
  });

  it("detects cols param", () => {
    const sp = new URLSearchParams();
    expect(hasContactsColumnsParam(sp)).toBe(false);
    sp.set("cols", "anrede:1");
    expect(hasContactsColumnsParam(sp)).toBe(true);
  });

  it("merges cols while preserving unrelated params", () => {
    const cur = new URLSearchParams("create=true&foo=bar");
    const href = mergeContactsColumnsIntoPath("/contacts", cur, { anrede: true, email: false });
    expect(href).toContain("create=true");
    expect(href).toContain("foo=bar");
    expect(href).toContain("cols=anrede%3A1%2Cemail%3A0");
  });

  it("applies session cols over current params", () => {
    const cur = new URLSearchParams("create=true");
    const href = mergeSessionContactsColumnsIntoPath("/contacts", cur, "anrede:1,email:0");
    expect(href).toContain("create=true");
    expect(href).toContain("cols=anrede%3A1%2Cemail%3A0");
  });
});

