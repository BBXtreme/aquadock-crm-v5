/** URL + session persistence for /contacts table column visibility. */

export type ContactsSearchParamsRead = Pick<URLSearchParams, "get" | "has" | "toString">;

export type ContactsColumnVisibilityState = Record<string, boolean>;

export const CONTACTS_COLUMNS_SESSION_STORAGE_KEY = "contacts:list:cols:v1";
export const CONTACTS_COLUMNS_PARAM_KEY = "cols";

const DEFAULT_CONTACTS_COLUMN_VISIBILITY: ContactsColumnVisibilityState = { anrede: false };

export function defaultContactsColumnVisibility(): ContactsColumnVisibilityState {
  return { ...DEFAULT_CONTACTS_COLUMN_VISIBILITY };
}

function encodeEntry(columnId: string, visible: boolean): string {
  return `${columnId}:${visible ? "1" : "0"}`;
}

function decodeEntry(token: string): [string, boolean] | null {
  const trimmed = token.trim();
  if (trimmed.length === 0) return null;
  const idx = trimmed.lastIndexOf(":");
  if (idx <= 0 || idx === trimmed.length - 1) return null;
  const key = trimmed.slice(0, idx).trim();
  const rawVal = trimmed.slice(idx + 1).trim();
  if (key.length === 0) return null;
  if (rawVal !== "0" && rawVal !== "1") return null;
  return [key, rawVal === "1"];
}

export function parseContactsColumnVisibility(
  searchParams: ContactsSearchParamsRead,
): ContactsColumnVisibilityState {
  const raw = searchParams.get(CONTACTS_COLUMNS_PARAM_KEY);
  if (raw === null || raw.trim().length === 0) {
    return defaultContactsColumnVisibility();
  }
  const next: ContactsColumnVisibilityState = {};
  for (const token of raw.split(",")) {
    const parsed = decodeEntry(token);
    if (parsed === null) continue;
    const [key, visible] = parsed;
    next[key] = visible;
  }
  return Object.keys(next).length === 0 ? defaultContactsColumnVisibility() : next;
}

export function serializeContactsColumnVisibility(state: ContactsColumnVisibilityState): string {
  const entries = Object.entries(state)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([columnId, visible]) => encodeEntry(columnId, visible));
  return entries.join(",");
}

export function contactsColumnVisibilityEqual(
  a: ContactsColumnVisibilityState,
  b: ContactsColumnVisibilityState,
): boolean {
  return serializeContactsColumnVisibility(a) === serializeContactsColumnVisibility(b);
}

export function hasContactsColumnsParam(searchParams: ContactsSearchParamsRead): boolean {
  return searchParams.has(CONTACTS_COLUMNS_PARAM_KEY);
}

export function mergeContactsColumnsIntoPath(
  pathname: string,
  current: ContactsSearchParamsRead,
  state: ContactsColumnVisibilityState,
): string {
  const next = new URLSearchParams(current.toString());
  next.delete(CONTACTS_COLUMNS_PARAM_KEY);
  const serialized = serializeContactsColumnVisibility(state);
  if (serialized.length > 0) {
    next.set(CONTACTS_COLUMNS_PARAM_KEY, serialized);
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export function mergeSessionContactsColumnsIntoPath(
  pathname: string,
  current: ContactsSearchParamsRead,
  sessionValue: string,
): string {
  const next = new URLSearchParams(current.toString());
  next.delete(CONTACTS_COLUMNS_PARAM_KEY);
  if (sessionValue.length > 0) {
    next.set(CONTACTS_COLUMNS_PARAM_KEY, sessionValue);
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export function readContactsColumnsFromSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CONTACTS_COLUMNS_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeContactsColumnsToSession(serialized: string): void {
  if (typeof window === "undefined") return;
  try {
    if (serialized.length === 0) {
      sessionStorage.removeItem(CONTACTS_COLUMNS_SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(CONTACTS_COLUMNS_SESSION_STORAGE_KEY, serialized);
    }
  } catch {
    // ignore
  }
}

export function shouldDeferEmptyContactsSessionWriteWhileRestoring(
  serialized: string,
  searchParams: ContactsSearchParamsRead,
): boolean {
  if (serialized.length > 0) return false;
  if (hasContactsColumnsParam(searchParams)) return false;
  const mem = readContactsColumnsFromSession();
  return !!(mem && mem.length > 0);
}

