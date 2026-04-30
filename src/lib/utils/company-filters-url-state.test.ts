import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPANIES_LIST_PARAM_KEYS,
  COMPANIES_LIST_SESSION_STORAGE_KEY,
  type CompaniesListUrlState,
  companiesListSearchStringFromPageSearchParams,
  companiesListStateKey,
  companiesListStatesEqual,
  companiesSortIdForQuery,
  defaultCompaniesListUrlState,
  extractCompaniesListSearchParamsString,
  hasAnyCompaniesListParamKey,
  mergeCompaniesListIntoPath,
  mergeSessionCompaniesListQuery,
  parseCompaniesListState,
  readCompaniesListQueryFromSession,
  serializeCompaniesListToSearchParamsString,
  shouldDeferEmptySessionWriteWhileRestoring,
  writeCompaniesListQueryToSession,
} from "./company-filters-url-state";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (typeof window !== "undefined" && typeof window.sessionStorage?.clear === "function") {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: window.sessionStorage,
    });
    window.sessionStorage.clear();
  }
});

describe("parseCompaniesListState", () => {
  it("returns defaults for empty search params", () => {
    const sp = new URLSearchParams();
    expect(parseCompaniesListState(sp)).toEqual(defaultCompaniesListUrlState());
  });

  it("parses comma-separated multi-filters and q", () => {
    const sp = new URLSearchParams();
    sp.set("status", "lead,gewonnen");
    sp.set("land", "DE,AT");
    sp.set("q", "  acme  ");
    const s = parseCompaniesListState(sp);
    expect(s.activeFilters.status).toEqual(["lead", "gewonnen"]);
    expect(s.activeFilters.land).toEqual(["DE", "AT"]);
    expect(s.globalFilter).toBe("  acme  ");
  });

  it("dedupes comma list values preserving first-seen order", () => {
    const sp = new URLSearchParams();
    sp.set("kategorie", "a,b,a");
    expect(parseCompaniesListState(sp).activeFilters.kategorie).toEqual(["a", "b"]);
  });

  it("skips empty comma-separated segments", () => {
    const sp = new URLSearchParams();
    sp.set("status", "lead,,gewonnen,");
    expect(parseCompaniesListState(sp).activeFilters.status).toEqual(["lead", "gewonnen"]);
  });

  it("parses hidden columns into VisibilityState entries", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "status,wassertyp");
    const s = parseCompaniesListState(sp);
    expect(s.columnVisibility).toEqual({
      status: false,
      wassertyp: false,
      verantwortlich: false,
      country: false,
    });
  });

  it("parses ow=1 as Verantwortlich column visible", () => {
    const sp = new URLSearchParams();
    sp.set("cols", "status");
    sp.set("ow", "1");
    const s = parseCompaniesListState(sp);
    expect(s.columnVisibility).toEqual({
      status: false,
      verantwortlich: true,
      country: false,
    });
  });

  it("parses cc=1 as Country column visible", () => {
    const sp = new URLSearchParams();
    sp.set("cc", "1");
    const s = parseCompaniesListState(sp);
    expect(s.columnVisibility.country).toBe(true);
    expect(s.columnVisibility.verantwortlich).toBe(false);
  });

  it("parses water preset when valid", () => {
    const sp = new URLSearchParams();
    sp.set("water", "le500");
    expect(parseCompaniesListState(sp).waterFilter).toBe("le500");
  });

  it("ignores invalid water preset", () => {
    const sp = new URLSearchParams();
    sp.set("water", "nope");
    expect(parseCompaniesListState(sp).waterFilter).toBeNull();
  });

  it("parses sort and dir", () => {
    const sp = new URLSearchParams();
    sp.set("sort", "created_at");
    sp.set("dir", "desc");
    const s = parseCompaniesListState(sp);
    expect(s.sorting[0]).toEqual({ id: "created_at", desc: true });
  });

  it("falls back sort id when unknown", () => {
    const sp = new URLSearchParams();
    sp.set("sort", "unknown_col");
    expect(parseCompaniesListState(sp).sorting[0]?.id).toBe("firmenname");
  });

  it("parses page (1-based) and size", () => {
    const sp = new URLSearchParams();
    sp.set("page", "3");
    sp.set("size", "50");
    const s = parseCompaniesListState(sp);
    expect(s.pagination.pageIndex).toBe(2);
    expect(s.pagination.pageSize).toBe(50);
  });

  it("clamps invalid page and size", () => {
    const sp = new URLSearchParams();
    sp.set("page", "0");
    sp.set("size", "999");
    const s = parseCompaniesListState(sp);
    expect(s.pagination.pageIndex).toBe(0);
    expect(s.pagination.pageSize).toBe(20);
  });
});

describe("serializeCompaniesListToSearchParamsString", () => {
  it("omits defaults", () => {
    const s = defaultCompaniesListUrlState();
    expect(serializeCompaniesListToSearchParamsString(s)).toBe("");
  });

  it("round-trips with parse via equality key", () => {
    const sp = new URLSearchParams();
    sp.set("status", "lead");
    sp.set("water", "gt1km");
    sp.set("sort", "wassertyp");
    sp.set("dir", "desc");
    sp.set("page", "2");
    sp.set("size", "10");
    sp.set("q", "foo");
    sp.set("cols", "status,wassertyp");
    const parsed = parseCompaniesListState(sp);
    const again = parseCompaniesListState(new URLSearchParams(serializeCompaniesListToSearchParamsString(parsed)));
    expect(companiesListStatesEqual(parsed, again)).toBe(true);
  });

  it("round-trips Verantwortlich visible via ow=1", () => {
    const base = defaultCompaniesListUrlState();
    const state: CompaniesListUrlState = {
      ...base,
      columnVisibility: { ...base.columnVisibility, verantwortlich: true, status: false },
    };
    const qs = serializeCompaniesListToSearchParamsString(state);
    const again = parseCompaniesListState(new URLSearchParams(qs));
    expect(companiesListStatesEqual(state, again)).toBe(true);
    expect(again.columnVisibility.verantwortlich).toBe(true);
  });

  it("round-trips Country column visible via cc=1", () => {
    const base = defaultCompaniesListUrlState();
    const state: CompaniesListUrlState = {
      ...base,
      columnVisibility: { ...base.columnVisibility, country: true },
    };
    const qs = serializeCompaniesListToSearchParamsString(state);
    const again = parseCompaniesListState(new URLSearchParams(qs));
    expect(companiesListStatesEqual(state, again)).toBe(true);
    expect(again.columnVisibility.country).toBe(true);
  });
});

describe("hasAnyCompaniesListParamKey", () => {
  it("returns false when only unrelated keys exist", () => {
    const sp = new URLSearchParams();
    sp.set("create", "true");
    expect(hasAnyCompaniesListParamKey(sp)).toBe(false);
  });

  it("returns true when any list key exists", () => {
    for (const k of COMPANIES_LIST_PARAM_KEYS) {
      const sp = new URLSearchParams();
      sp.set(k, k === "page" ? "2" : "x");
      expect(hasAnyCompaniesListParamKey(sp)).toBe(true);
    }
  });
});

describe("mergeCompaniesListIntoPath", () => {
  it("preserves unrelated query keys", () => {
    const cur = new URLSearchParams("create=true&foo=bar");
    const state: CompaniesListUrlState = {
      ...defaultCompaniesListUrlState(),
      activeFilters: {
        ...defaultCompaniesListUrlState().activeFilters,
        status: ["lead"],
      },
    };
    const href = mergeCompaniesListIntoPath("/companies", cur, state);
    expect(href).toContain("create=true");
    expect(href).toContain("foo=bar");
    expect(href).toContain("status=lead");
  });

  it("drops list keys when serialized state is empty", () => {
    const cur = new URLSearchParams("status=lead&create=true");
    const href = mergeCompaniesListIntoPath("/companies", cur, defaultCompaniesListUrlState());
    expect(href).toContain("create=true");
    expect(href.includes("status")).toBe(false);
  });
});

describe("mergeSessionCompaniesListQuery", () => {
  it("merges stored list params over current", () => {
    const cur = new URLSearchParams("create=true");
    const href = mergeSessionCompaniesListQuery("/companies", cur, "status=lead&page=2");
    expect(href).toContain("create=true");
    expect(href).toContain("status=lead");
    expect(href).toContain("page=2");
  });
});

describe("companiesSortIdForQuery", () => {
  it("maps adresse to stadt", () => {
    expect(companiesSortIdForQuery("adresse")).toBe("stadt");
  });

  it("passes through db column ids", () => {
    expect(companiesSortIdForQuery("firmenname")).toBe("firmenname");
  });
});

describe("extractCompaniesListSearchParamsString", () => {
  it("keeps only companies list keys and drops others", () => {
    const sp = new URLSearchParams();
    sp.set("status", "lead");
    sp.set("aiEnrich", "1");
    sp.set("foo", "bar");
    expect(extractCompaniesListSearchParamsString(sp)).toBe("status=lead");
  });
});

describe("companiesListSearchStringFromPageSearchParams", () => {
  it("extracts list keys from Next-style search param record", () => {
    const s = companiesListSearchStringFromPageSearchParams({
      status: "lead,gewonnen",
      aiEnrich: "1",
      unrelated: "x",
    });
    expect(new URLSearchParams(s).get("status")).toBe("lead,gewonnen");
    expect(s.includes("aiEnrich")).toBe(false);
  });

  it("uses first string when value is string[]", () => {
    const s = companiesListSearchStringFromPageSearchParams({
      land: ["DE", "AT"],
    });
    expect(new URLSearchParams(s).get("land")).toBe("DE");
  });

  it("ignores non-positive array branch when value is empty string[]", () => {
    expect(companiesListSearchStringFromPageSearchParams({ status: [] })).toBe("");
  });

  it("ignores array entry when first element is empty string", () => {
    expect(companiesListSearchStringFromPageSearchParams({ land: ["", "DE"] })).toBe("");
  });
});

describe("companiesListStateKey", () => {
  it("uses defaults when sorting array is empty", () => {
    const base = defaultCompaniesListUrlState();
    const state: CompaniesListUrlState = { ...base, sorting: [] };
    const key = companiesListStateKey(state);
    expect(key).toContain("firmenname");
    expect(key).toContain('"sortDesc":false');
  });
});

describe("session list query helpers", () => {
  it("readCompaniesListQueryFromSession returns null without window", () => {
    vi.stubGlobal("window", undefined);
    expect(readCompaniesListQueryFromSession()).toBeNull();
  });

  it("readCompaniesListQueryFromSession returns null when sessionStorage throws", () => {
    const spy = vi.spyOn(sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readCompaniesListQueryFromSession()).toBeNull();
    spy.mockRestore();
  });

  it("writeCompaniesListQueryToSession no-ops without window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => writeCompaniesListQueryToSession("status=lead")).not.toThrow();
  });

  it("writeCompaniesListQueryToSession clears storage for empty query", () => {
    sessionStorage.setItem(COMPANIES_LIST_SESSION_STORAGE_KEY, "old=1");
    writeCompaniesListQueryToSession("");
    expect(sessionStorage.getItem(COMPANIES_LIST_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("writeCompaniesListQueryToSession ignores storage errors", () => {
    const removeSpy = vi.spyOn(sessionStorage, "removeItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const setSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeCompaniesListQueryToSession("")).not.toThrow();
    expect(() => writeCompaniesListQueryToSession("q=x")).not.toThrow();
    removeSpy.mockRestore();
    setSpy.mockRestore();
  });
});

describe("shouldDeferEmptySessionWriteWhileRestoring", () => {
  it("does not defer when serialized list is non-empty", () => {
    expect(shouldDeferEmptySessionWriteWhileRestoring("status=lead", new URLSearchParams())).toBe(false);
  });

  it("does not defer when URL already has list params", () => {
    const sp = new URLSearchParams();
    sp.set("q", "x");
    sessionStorage.setItem(COMPANIES_LIST_SESSION_STORAGE_KEY, "status=lead");
    expect(shouldDeferEmptySessionWriteWhileRestoring("", sp)).toBe(false);
  });

  it("defers when URL empty, serialized empty, and session has stored query", () => {
    sessionStorage.setItem(COMPANIES_LIST_SESSION_STORAGE_KEY, "water=le100");
    expect(shouldDeferEmptySessionWriteWhileRestoring("", new URLSearchParams())).toBe(true);
  });

  it("does not defer when session is empty", () => {
    expect(shouldDeferEmptySessionWriteWhileRestoring("", new URLSearchParams())).toBe(false);
  });
});
