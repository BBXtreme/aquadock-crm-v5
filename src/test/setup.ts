import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

/** JSDOM may omit or stub `scrollIntoView`; company comments / highlights rely on it. */
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn() as unknown as typeof Element.prototype.scrollIntoView;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () =>
    typeof window !== "undefined" && typeof window.location.pathname === "string"
      ? window.location.pathname
      : "/",
  useSearchParams: () =>
    new URLSearchParams(
      typeof window !== "undefined" && typeof window.location.search === "string" ? window.location.search : "",
    ),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));
