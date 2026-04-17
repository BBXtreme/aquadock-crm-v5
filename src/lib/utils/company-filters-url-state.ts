/** URL + session persistence for the /companies list view (filters, search, sort, pagination). */

/** Same surface as `URLSearchParams` / Next `ReadonlyURLSearchParams` for list parsing. */
export type CompaniesListSearchParamsRead = Pick<URLSearchParams, "get" | "has" | "toString">;

export type CompaniesFilterGroup = "status" | "kategorie" | "betriebstyp" | "land" | "wassertyp";

export type CompaniesWaterPreset = "at" | "le100" | "le500" | "le1km" | "gt1km";

export type CompaniesListUrlState = {
  pagination: { pageIndex: number; pageSize: number };
  sorting: { id: string; desc: boolean }[];
  activeFilters: Record<CompaniesFilterGroup, string[]>;
  waterFilter: CompaniesWaterPreset | null;
  /** Search string applied to the list query (debounced in the page). */
  globalFilter: string;
};

export const COMPANIES_LIST_SESSION_STORAGE_KEY = "companies:list:v1";

export const COMPANIES_LIST_PARAM_KEYS = [
  "q",
  "status",
  "kategorie",
  "betriebstyp",
  "land",
  "wassertyp",
  "water",
  "sort",
  "dir",
  "page",
  "size",
] as const;

const WATER_PRESETS: readonly CompaniesWaterPreset[] = ["at", "le100", "le500", "le1km", "gt1km"];

const ALLOWED_PAGE_SIZES = new Set([10, 20, 30, 50, 100]);

/** TanStack column ids that map to real Supabase columns for `.order()`. */
const SORT_IDS_DB = new Set([
  "firmenname",
  "kundentyp",
  "status",
  "wasserdistanz",
  "wassertyp",
  "created_at",
]);

/** UI column id for address; sort by `stadt` in the database. */
export const COMPANIES_SORT_ID_ADRESSE = "adresse";

const SORT_IDS_UI = new Set<string>([...SORT_IDS_DB, COMPANIES_SORT_ID_ADRESSE]);

export function defaultCompaniesListUrlState(): CompaniesListUrlState {
  return {
    pagination: { pageIndex: 0, pageSize: 20 },
    sorting: [{ id: "firmenname", desc: false }],
    activeFilters: {
      status: [],
      kategorie: [],
      betriebstyp: [],
      land: [],
      wassertyp: [],
    },
    waterFilter: null,
    globalFilter: "",
  };
}

/** Map table/UI sort column id to a column name accepted by Supabase `.order()`. */
export function companiesSortIdForQuery(sortId: string): string {
  if (sortId === COMPANIES_SORT_ID_ADRESSE) {
    return "stadt";
  }
  return sortId;
}

function splitCommaList(raw: string | null): string[] {
  if (raw === null || raw === "") {
    return [];
  }
  const parts = raw.split(",");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const t = p.trim();
    if (t.length === 0) {
      continue;
    }
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function parseWater(raw: string | null): CompaniesWaterPreset | null {
  if (raw === null || raw === "") {
    return null;
  }
  return WATER_PRESETS.includes(raw as CompaniesWaterPreset) ? (raw as CompaniesWaterPreset) : null;
}

function parsePageSize(raw: string | null): number {
  if (raw === null || raw === "") {
    return 20;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || !ALLOWED_PAGE_SIZES.has(n)) {
    return 20;
  }
  return n;
}

function parsePageIndexOneBased(raw: string | null): number {
  if (raw === null || raw === "") {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 0;
  }
  return n - 1;
}

function parseSortId(raw: string | null): string {
  if (raw === null || raw === "") {
    return "firmenname";
  }
  return SORT_IDS_UI.has(raw) ? raw : "firmenname";
}

function parseDesc(raw: string | null): boolean {
  return raw === "desc";
}

export function parseCompaniesListState(searchParams: CompaniesListSearchParamsRead): CompaniesListUrlState {
  const sortId = parseSortId(searchParams.get("sort"));
  const desc = parseDesc(searchParams.get("dir"));
  return {
    pagination: {
      pageIndex: parsePageIndexOneBased(searchParams.get("page")),
      pageSize: parsePageSize(searchParams.get("size")),
    },
    sorting: [{ id: sortId, desc }],
    activeFilters: {
      status: splitCommaList(searchParams.get("status")),
      kategorie: splitCommaList(searchParams.get("kategorie")),
      betriebstyp: splitCommaList(searchParams.get("betriebstyp")),
      land: splitCommaList(searchParams.get("land")),
      wassertyp: splitCommaList(searchParams.get("wassertyp")),
    },
    waterFilter: parseWater(searchParams.get("water")),
    globalFilter: searchParams.get("q") ?? "",
  };
}

function sortedCopy(arr: string[]): string[] {
  return [...arr].sort((a, b) => a.localeCompare(b));
}

/** Stable key for equality checks (normalized arrays). */
export function companiesListStateKey(state: CompaniesListUrlState): string {
  const s0 = state.sorting[0];
  return JSON.stringify({
    pageIndex: state.pagination.pageIndex,
    pageSize: state.pagination.pageSize,
    sortId: s0?.id ?? "firmenname",
    sortDesc: s0?.desc ?? false,
    status: sortedCopy(state.activeFilters.status),
    kategorie: sortedCopy(state.activeFilters.kategorie),
    betriebstyp: sortedCopy(state.activeFilters.betriebstyp),
    land: sortedCopy(state.activeFilters.land),
    wassertyp: sortedCopy(state.activeFilters.wassertyp),
    water: state.waterFilter,
    q: state.globalFilter.trim(),
  });
}

export function companiesListStatesEqual(a: CompaniesListUrlState, b: CompaniesListUrlState): boolean {
  return companiesListStateKey(a) === companiesListStateKey(b);
}

/** Serialize list-only params (no `?` prefix). Omits defaults. */
export function serializeCompaniesListToSearchParamsString(state: CompaniesListUrlState): string {
  const next = new URLSearchParams();
  const q = state.globalFilter.trim();
  if (q.length > 0) {
    next.set("q", q);
  }
  const setCsv = (key: string, values: string[]) => {
    if (values.length === 0) {
      return;
    }
    next.set(key, values.join(","));
  };
  setCsv("status", state.activeFilters.status);
  setCsv("kategorie", state.activeFilters.kategorie);
  setCsv("betriebstyp", state.activeFilters.betriebstyp);
  setCsv("land", state.activeFilters.land);
  setCsv("wassertyp", state.activeFilters.wassertyp);
  if (state.waterFilter) {
    next.set("water", state.waterFilter);
  }
  const sort0 = state.sorting[0];
  const sortId = sort0?.id ?? "firmenname";
  const sortDesc = sort0?.desc ?? false;
  if (sortId !== "firmenname") {
    next.set("sort", sortId);
  }
  if (sortDesc) {
    next.set("dir", "desc");
  }
  if (state.pagination.pageIndex > 0) {
    next.set("page", String(state.pagination.pageIndex + 1));
  }
  if (state.pagination.pageSize !== 20) {
    next.set("size", String(state.pagination.pageSize));
  }
  return next.toString();
}

export function hasAnyCompaniesListParamKey(searchParams: CompaniesListSearchParamsRead): boolean {
  for (const k of COMPANIES_LIST_PARAM_KEYS) {
    if (searchParams.has(k)) {
      return true;
    }
  }
  return false;
}

/** Merge list state into current search params; returns full path `/companies?...` or `/companies`. */
export function mergeCompaniesListIntoPath(
  pathname: string,
  current: CompaniesListSearchParamsRead,
  state: CompaniesListUrlState,
): string {
  const next = new URLSearchParams(current.toString());
  for (const k of COMPANIES_LIST_PARAM_KEYS) {
    next.delete(k);
  }
  const listQs = serializeCompaniesListToSearchParamsString(state);
  if (listQs.length > 0) {
    const listParams = new URLSearchParams(listQs);
    for (const [k, v] of listParams.entries()) {
      next.set(k, v);
    }
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

/** Apply session-stored list query onto current params (drops existing list keys first). */
export function mergeSessionCompaniesListQuery(
  pathname: string,
  current: CompaniesListSearchParamsRead,
  sessionQueryWithoutQuestionMark: string,
): string {
  const next = new URLSearchParams(current.toString());
  for (const k of COMPANIES_LIST_PARAM_KEYS) {
    next.delete(k);
  }
  const stored = new URLSearchParams(sessionQueryWithoutQuestionMark);
  for (const k of COMPANIES_LIST_PARAM_KEYS) {
    const v = stored.get(k);
    if (v !== null && v !== "") {
      next.set(k, v);
    }
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export function readCompaniesListQueryFromSession(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(COMPANIES_LIST_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCompaniesListQueryToSession(queryWithoutQuestionMark: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (queryWithoutQuestionMark.length === 0) {
      sessionStorage.removeItem(COMPANIES_LIST_SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(COMPANIES_LIST_SESSION_STORAGE_KEY, queryWithoutQuestionMark);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Avoid clearing session before session-restore `router.replace` runs (bare `/companies` + stored filters). */
export function shouldDeferEmptySessionWriteWhileRestoring(
  serializedList: string,
  searchParams: CompaniesListSearchParamsRead,
): boolean {
  if (serializedList.length > 0) {
    return false;
  }
  if (hasAnyCompaniesListParamKey(searchParams)) {
    return false;
  }
  const mem = readCompaniesListQueryFromSession();
  return !!(mem && mem.length > 0);
}
