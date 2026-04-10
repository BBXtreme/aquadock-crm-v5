/**
 * Password recovery: {@link ./page.tsx} — panel mutation, URL/bootstrap detection, success UI.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PW_RECOVERY_SESSION_STORAGE_KEY } from "@/lib/constants/auth-recovery";

import LoginPage, {
  consumePasswordRecoveryBootstrapFlag,
  isPasswordRecoveryFromUrl,
  PasswordRecoveryUpdatePanel,
} from "./page";

const hoisted = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: hoisted.routerReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: hoisted.createClientMock,
}));

vi.mock("@supabase/auth-ui-react", () => ({
  Auth: () => <div data-testid="auth-ui">Auth</div>,
}));

vi.mock("@supabase/auth-ui-shared", () => ({
  ThemeSupa: {},
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

const mockedToast = vi.mocked(toast);

function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderWithQuery(ui: ReactElement) {
  const Wrapper = createQueryWrapper();
  return render(ui, { wrapper: Wrapper });
}

function getRecoveryForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (form === null) {
    throw new Error("Expected a recovery <form> in the container");
  }
  return form;
}

function base64UrlEncodeJson(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Minimal JWT body so {@link accessTokenIndicatesRecovery} in page.tsx returns true. */
function buildRecoveryAccessToken(): string {
  return `e30.${base64UrlEncodeJson({ amr: [{ method: "recovery" }] })}.sig`;
}

/** JWT that parses but does not indicate recovery (proves ref latch blocks dashboard redirect). */
function buildNonRecoveryAccessToken(): string {
  return `e30.${base64UrlEncodeJson({})}.sig`;
}

type AuthStateListener = (
  event: string,
  session: { access_token: string } | null,
) => void;

function setupLoginPageWithCapturedAuthListener(): {
  auth: { listener: AuthStateListener | null };
  onAuthStateChange: ReturnType<typeof vi.fn>;
} {
  const auth: { listener: AuthStateListener | null } = { listener: null };
  const onAuthStateChange = vi.fn((callback: AuthStateListener) => {
    auth.listener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  hoisted.createClientMock.mockReturnValue({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: {} },
        error: null,
      }),
      onAuthStateChange,
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  });

  return { auth, onAuthStateChange };
}

function createTestSupabase(overrides: {
  updateUser?: ReturnType<typeof vi.fn>;
} = {}): SupabaseClient {
  const updateUser =
    overrides.updateUser ??
    vi.fn().mockResolvedValue({ data: { user: {} }, error: null });

  return {
    auth: {
      updateUser,
    },
  } as unknown as SupabaseClient;
}

describe("isPasswordRecoveryFromUrl", () => {
  const originalHref = window.location.href;

  afterEach(() => {
    window.history.replaceState(null, "", originalHref);
  });

  it("returns true when hash contains type=recovery", () => {
    window.history.replaceState(null, "", `${originalHref.split("#")[0]}#type=recovery`);
    expect(isPasswordRecoveryFromUrl()).toBe(true);
  });

  it("returns true when query contains type=recovery", () => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?type=recovery`,
    );
    expect(isPasswordRecoveryFromUrl()).toBe(true);
  });

  it("returns false when neither hash nor query indicates recovery", () => {
    window.history.replaceState(null, "", `${window.location.pathname}`);
    expect(isPasswordRecoveryFromUrl()).toBe(false);
  });
});

describe("consumePasswordRecoveryBootstrapFlag", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns true once when key is set and removes the key", () => {
    sessionStorage.setItem(PW_RECOVERY_SESSION_STORAGE_KEY, "1");
    expect(consumePasswordRecoveryBootstrapFlag()).toBe(true);
    expect(sessionStorage.getItem(PW_RECOVERY_SESSION_STORAGE_KEY)).toBeNull();
    expect(consumePasswordRecoveryBootstrapFlag()).toBe(false);
  });

  it("returns false when key is absent", () => {
    expect(consumePasswordRecoveryBootstrapFlag()).toBe(false);
  });
});

describe("PasswordRecoveryUpdatePanel", () => {
  beforeEach(() => {
    mockedToast.error.mockClear();
    vi.clearAllMocks();
  });

  it("calls updateUser with new password and invokes onRecoverySuccess", async () => {
    const user = userEvent.setup();
    const onRecoverySuccess = vi.fn();
    const updateUser = vi
      .fn()
      .mockResolvedValue({ data: { user: {} }, error: null });
    const supabase = createTestSupabase({ updateUser });

    const view = renderWithQuery(
      <PasswordRecoveryUpdatePanel
        supabase={supabase}
        recoverySaved={false}
        onRecoverySuccess={onRecoverySuccess}
      />,
    );

    const form = within(getRecoveryForm(view.container));
    await user.type(form.getByLabelText("Neues Passwort"), "newpass12");
    await user.type(form.getByLabelText("Passwort bestätigen"), "newpass12");
    await user.click(
      form.getByRole("button", { name: "Neues Passwort speichern" }),
    );

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: "newpass12" });
    });
    await waitFor(() => {
      expect(onRecoverySuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows dedicated toast when updateUser returns an error", async () => {
    const user = userEvent.setup();
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Passwort zu schwach" },
    });
    const supabase = createTestSupabase({ updateUser });

    const view = renderWithQuery(
      <PasswordRecoveryUpdatePanel
        supabase={supabase}
        recoverySaved={false}
        onRecoverySuccess={vi.fn()}
      />,
    );

    const form = within(getRecoveryForm(view.container));
    await user.type(form.getByLabelText("Neues Passwort"), "newpass12");
    await user.type(form.getByLabelText("Passwort bestätigen"), "newpass12");
    await user.click(
      form.getByRole("button", { name: "Neues Passwort speichern" }),
    );

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        "Passwort konnte nicht gespeichert werden.",
        { description: "Passwort zu schwach" },
      );
    });
  });

  it("renders success copy and an icon when recoverySaved is true", () => {
    const supabase = createTestSupabase();
    const { container } = renderWithQuery(
      <PasswordRecoveryUpdatePanel
        supabase={supabase}
        recoverySaved
        onRecoverySuccess={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Passwort erfolgreich geändert/, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sie werden zur Anmeldung weitergeleitet/, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("shows Wird gespeichert while updateUser is in flight", async () => {
    const user = userEvent.setup();
    let resolveUpdate: (value: unknown) => void = () => undefined;
    const updateUser = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const supabase = createTestSupabase({ updateUser });

    const view = renderWithQuery(
      <PasswordRecoveryUpdatePanel
        supabase={supabase}
        recoverySaved={false}
        onRecoverySuccess={vi.fn()}
      />,
    );

    const form = within(getRecoveryForm(view.container));
    await user.type(form.getByLabelText("Neues Passwort"), "longpass12");
    await user.type(form.getByLabelText("Passwort bestätigen"), "longpass12");
    await user.click(
      form.getByRole("button", { name: "Neues Passwort speichern" }),
    );

    expect(
      await form.findByRole("button", { name: "Wird gespeichert…" }),
    ).toBeDisabled();

    resolveUpdate({ data: { user: {} }, error: null });

    await waitFor(() => {
      expect(
        form.getByRole("button", { name: "Neues Passwort speichern" }),
      ).toBeInTheDocument();
    });
  });
});

describe("LoginPage recovery redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.routerReplace.mockClear();
    sessionStorage.clear();
    mockedToast.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("after successful password update, immediately replaces to /login", async () => {
    const user = userEvent.setup();

    const updateUser = vi.fn().mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    const recoveryAccessToken = buildRecoveryAccessToken();
    const recoverySession = {
      access_token: recoveryAccessToken,
      refresh_token: "test-refresh",
    };

    hoisted.createClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: recoverySession },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" }, error: null },
        }),
        setSession: vi.fn().mockResolvedValue({
          data: { session: recoverySession },
          error: null,
        }),
        updateUser,
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    });

    sessionStorage.setItem(PW_RECOVERY_SESSION_STORAGE_KEY, "1");

    const view = renderWithQuery(<LoginPage />);

    const form = await waitFor(() => getRecoveryForm(view.container));
    const inForm = within(form);
    await user.type(inForm.getByLabelText("Neues Passwort"), "freshpass12");
    await user.type(
      inForm.getByLabelText("Passwort bestätigen"),
      "freshpass12",
    );
    await user.click(
      inForm.getByRole("button", { name: "Neues Passwort speichern" }),
    );

    await waitFor(() => expect(updateUser).toHaveBeenCalled());

    await waitFor(() => {
      expect(hoisted.routerReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows timeout copy and toast when recovery latch never gets a session", async () => {
    vi.useFakeTimers();
    try {
      hoisted.createClientMock.mockReturnValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
          setSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          updateUser: vi.fn(),
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
          })),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      sessionStorage.setItem(PW_RECOVERY_SESSION_STORAGE_KEY, "1");

      renderWithQuery(<LoginPage />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText(/Sitzung wird vorbereitet/, { exact: false })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(
        screen.getByText(/Link ungültig oder abgelaufen/, { exact: false }),
      ).toBeInTheDocument();

      expect(mockedToast.error).toHaveBeenCalledWith(
        "Link ungültig oder abgelaufen.",
        expect.objectContaining({
          description: expect.stringContaining("Bitte fordern"),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("LoginPage onAuthStateChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.routerReplace.mockClear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("PASSWORD_RECOVERY switches to update_password and latches recovery (no dashboard redirect on later SIGNED_IN)", async () => {
    const { auth, onAuthStateChange } = setupLoginPageWithCapturedAuthListener();

    const view = renderWithQuery(<LoginPage />);

    await waitFor(() => {
      expect(onAuthStateChange).toHaveBeenCalled();
      expect(auth.listener).not.toBeNull();
    });

    auth.listener?.("PASSWORD_RECOVERY", null);

    await waitFor(() => {
      expect(
        within(view.container).getByText("Neues Passwort festlegen"),
      ).toBeInTheDocument();
    });

    auth.listener?.("SIGNED_IN", {
      access_token: buildNonRecoveryAccessToken(),
    });

    await waitFor(() => {
      expect(hoisted.routerReplace).not.toHaveBeenCalledWith("/dashboard");
    });
  });

  it("SIGNED_IN with recovery JWT in access_token shows update_password instead of redirecting to dashboard", async () => {
    const { auth, onAuthStateChange } = setupLoginPageWithCapturedAuthListener();

    const view = renderWithQuery(<LoginPage />);

    await waitFor(() => {
      expect(onAuthStateChange).toHaveBeenCalled();
      expect(auth.listener).not.toBeNull();
    });

    auth.listener?.("SIGNED_IN", {
      access_token: buildRecoveryAccessToken(),
    });

    await waitFor(() => {
      expect(
        within(view.container).getByText("Neues Passwort festlegen"),
      ).toBeInTheDocument();
    });

    expect(hoisted.routerReplace).not.toHaveBeenCalledWith("/dashboard");
  });
});
