import { describe, expect, it } from "vitest";
import {
  COMPANIES_LIST_PARAM_KEYS,
  type CompaniesListUrlState,
  companiesListStatesEqual,
  companiesSortIdForQuery,
  defaultCompaniesListUrlState,
  hasAnyCompaniesListParamKey,
  mergeCompaniesListIntoPath,
  mergeSessionCompaniesListQuery,
  parseCompaniesListState,
  serializeCompaniesListToSearchParamsString,
} from "./company-filters-url-state";

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
    const parsed = parseCompaniesListState(sp);
    const again = parseCompaniesListState(new URLSearchParams(serializeCompaniesListToSearchParamsString(parsed)));
    expect(companiesListStatesEqual(parsed, again)).toBe(true);
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
