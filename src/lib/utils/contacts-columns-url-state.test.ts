import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTACTS_COLUMNS_SESSION_STORAGE_KEY,
  contactsColumnVisibilityEqual,
  defaultContactsColumnVisibility,
  hasContactsColumnsParam,
  mergeContactsColumnsIntoPath,
  mergeSessionContactsColumnsIntoPath,
  parseContactsColumnVisibility,
  readContactsColumnsFromSession,
  serializeContactsColumnVisibility,
  shouldDeferEmptyContactsSessionWriteWhileRestoring,
  writeContactsColumnsToSession,
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
    expect(parsed).toEqual({ anrede: true, email: false, verantwortlich: false });
  });

  it("serializes visibility state deterministically", () => {
    const serialized = serializeContactsColumnVisibility({ email: false, anrede: true, verantwortlich: false });
    expect(serialized).toBe("anrede:1,email:0,verantwortlich:0");
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
    const href = mergeContactsColumnsIntoPath("/contacts", cur, {
      anrede: true,
      email: false,
      verantwortlich: false,
    });
    expect(href).toContain("create=true");
    expect(href).toContain("foo=bar");
    expect(href).toContain("cols=anrede%3A1%2Cemail%3A0%2Cverantwortlich%3A0");
  });

  it("applies session cols over current params", () => {
    const cur = new URLSearchParams("create=true");
    const href = mergeSessionContactsColumnsIntoPath("/contacts", cur, "anrede:1,email:0");
    expect(href).toContain("create=true");
    expect(href).toContain("cols=anrede%3A1%2Cemail%3A0");
  });

  it("returns default when cols is whitespace only", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "   ");
    expect(parseContactsColumnVisibility(sp)).toEqual(defaultContactsColumnVisibility());
  });

  it("returns default when every token is invalid", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "bad,:x,email:2");
    expect(parseContactsColumnVisibility(sp)).toEqual(defaultContactsColumnVisibility());
  });

  it("ignores invalid tokens and keeps valid ones", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "bad,email:1");
    expect(parseContactsColumnVisibility(sp)).toEqual({
      ...defaultContactsColumnVisibility(),
      email: true,
    });
  });

  it("mergeSession path omits cols when session value is empty", () => {
    const href = mergeSessionContactsColumnsIntoPath("/contacts", new URLSearchParams("a=1"), "");
    expect(href).toBe("/contacts?a=1");
  });

  it("mergeContactsColumnsIntoPath drops cols when serialized is empty", () => {
    const href = mergeContactsColumnsIntoPath("/contacts", new URLSearchParams("cols=old"), {});
    expect(href).toBe("/contacts");
  });

  it("reads and writes session storage", () => {
    const store: Record<string, string> = {};
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => store[key] ?? null);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      store[key] = value;
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      delete store[key];
    });
    try {
      expect(readContactsColumnsFromSession()).toBe(null);
      writeContactsColumnsToSession("anrede:1");
      expect(readContactsColumnsFromSession()).toBe("anrede:1");
      writeContactsColumnsToSession("");
      expect(removeItem).toHaveBeenCalledWith(CONTACTS_COLUMNS_SESSION_STORAGE_KEY);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
      removeItem.mockRestore();
    }
  });

  it("readContactsColumnsFromSession returns null when getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(readContactsColumnsFromSession()).toBe(null);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("writeContactsColumnsToSession ignores setItem errors", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    try {
      expect(() => writeContactsColumnsToSession("x")).not.toThrow();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("shouldDeferEmptyContactsSessionWriteWhileRestoring defers when session has data but URL has no cols", () => {
    const store: Record<string, string> = { [CONTACTS_COLUMNS_SESSION_STORAGE_KEY]: "email:1" };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => store[key] ?? null);
    try {
      expect(
        shouldDeferEmptyContactsSessionWriteWhileRestoring("", new URLSearchParams()),
      ).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("shouldDeferEmptyContactsSessionWriteWhileRestoring does not defer when serialized is non-empty", () => {
    expect(shouldDeferEmptyContactsSessionWriteWhileRestoring("a:1", new URLSearchParams())).toBe(
      false,
    );
  });

  it("shouldDeferEmptyContactsSessionWriteWhileRestoring does not defer when URL already has cols", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "email:1");
    expect(shouldDeferEmptyContactsSessionWriteWhileRestoring("", sp)).toBe(false);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

