// src/app/(auth)/login/page.tsx
// Login + password recovery. Next.js SSR initial state has no `window`, so we must not
// call createClient() until useLayoutEffect reads the hash (tokens) first; otherwise the
// client consumes the hash while view stays "sign_in" from hydration (Vercel symptom).

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PW_RECOVERY_SESSION_STORAGE_KEY } from "@/lib/constants/auth-recovery";
import { createClient } from "@/lib/supabase/browser";
import {
  type PasswordRecoverySetFormValues,
  passwordRecoverySetSchema,
} from "@/lib/validations/profile";

/** Supabase Auth UI theme tokens — use CSS variables so light/dark follow `html.dark` (ThemeSupa defaults hard-code `inputText: black`). */
const loginAuthAppearanceVariables = {
  colors: {
    brand: "var(--primary)",
    brandAccent: "var(--ring)",
    brandButtonText: "var(--primary-foreground)",
    defaultButtonBackground: "var(--card)",
    defaultButtonBackgroundHover: "var(--muted)",
    defaultButtonBorder: "var(--border)",
    defaultButtonText: "var(--foreground)",
    dividerBackground: "var(--border)",
    inputBackground: "var(--card)",
    inputBorder: "var(--border)",
    inputBorderHover: "var(--ring)",
    inputBorderFocus: "var(--ring)",
    inputText: "var(--foreground)",
    inputLabelText: "var(--foreground)",
    inputPlaceholder: "var(--muted-foreground)",
    messageText: "var(--foreground)",
    messageBackground: "var(--muted)",
    messageBorder: "var(--border)",
    messageTextDanger: "var(--destructive)",
    messageBackgroundDanger: "color-mix(in oklch, var(--destructive) 12%, transparent)",
    messageBorderDanger: "var(--destructive)",
    anchorTextColor: "var(--muted-foreground)",
    anchorTextHoverColor: "var(--foreground)",
  },
  fontSizes: {
    baseBodySize: "16px",
    baseInputSize: "16px",
    baseLabelSize: "16px",
    baseButtonSize: "16px",
  },
  radii: {
    borderRadiusButton: "var(--radius)",
    buttonBorderRadius: "var(--radius)",
    inputBorderRadius: "var(--radius)",
  },
} as const;

/**
 * Single browser client for `/login`. React 18 Strict Mode (dev + some prod paths)
 * mounts twice; a second `createClient()` can run after the recovery hash was already
 * consumed → no session → `updateUser` throws "Auth session missing!".
 */
let loginPageBrowserSupabase: SupabaseClient | null = null;

function getLoginPageSupabaseClient(): SupabaseClient {
  const isTestRuntime =
    typeof process !== "undefined" &&
    (process.env.VITEST === "true" || process.env.NODE_ENV === "test");
  if (isTestRuntime) {
    return createClient();
  }
  if (loginPageBrowserSupabase === null) {
    loginPageBrowserSupabase = createClient();
  }
  return loginPageBrowserSupabase;
}

type LoginAuthView = "sign_in" | "sign_up" | "update_password";

type LoginAuthErrorBoundaryProps = { children: ReactNode };

type LoginAuthErrorBoundaryState = { didCatch: boolean };

/** React error boundaries must be a class; function components cannot implement `getDerivedStateFromError`. */
class LoginAuthErrorBoundary extends Component<
  LoginAuthErrorBoundaryProps,
  LoginAuthErrorBoundaryState
> {
  state: LoginAuthErrorBoundaryState = { didCatch: false };

  static getDerivedStateFromError(): LoginAuthErrorBoundaryState {
    return { didCatch: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    toast.error("Ein unerwarteter Fehler ist aufgetreten.", {
      description: message,
    });
  }

  render() {
    if (this.state.didCatch) {
      return (
        <p className="text-center text-muted-foreground text-sm">
          Bitte laden Sie die Seite neu.
        </p>
      );
    }
    return this.props.children;
  }
}

export function isPasswordRecoveryFromUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const fromHash = new URLSearchParams(hash).get("type");
    if (fromHash === "recovery") {
      return true;
    }
  }
  return (
    new URLSearchParams(window.location.search).get("type") === "recovery"
  );
}

/** True when the URL may still carry tokens the browser client must exchange or parse. */
function urlMayCarryRecoveryTokens(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (isPasswordRecoveryFromUrl()) {
    return true;
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hp = new URLSearchParams(hash);
    if (hp.has("access_token") && hp.has("refresh_token")) {
      return true;
    }
  }
  const sp = new URLSearchParams(window.location.search);
  return sp.has("code");
}

/**
 * When implicit recovery tokens are still in the hash but auto-detect did not persist them,
 * establish the session explicitly (production/Vercel).
 */
async function tryHydrateRecoverySessionFromHash(
  supabase: SupabaseClient,
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) {
    return false;
  }
  const params = new URLSearchParams(raw);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    return false;
  }
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) {
    return false;
  }
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  return true;
}

const RECOVERY_SESSION_READY_TIMEOUT_MS = 10_000;

function amrIndicatesRecovery(amr: unknown): boolean {
  let list: unknown = amr;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list) as unknown;
    } catch {
      return false;
    }
  }
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some((entry) => {
    if (entry === "recovery") {
      return true;
    }
    if (typeof entry === "object" && entry !== null && "method" in entry) {
      return (entry as { method?: string }).method === "recovery";
    }
    return false;
  });
}

/** GoTrue recovery sessions include `amr` with method recovery (see Supabase JWT docs). */
function accessTokenIndicatesRecovery(accessToken: string): boolean {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return false;
    }
    const payloadPart = parts[1];
    if (payloadPart === undefined) {
      return false;
    }
    let base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
      base64 += "=".repeat(4 - pad);
    }
    const json = atob(base64);
    const payload = JSON.parse(json) as { amr?: unknown };
    return amrIndicatesRecovery(payload.amr);
  } catch {
    return false;
  }
}

/** Set by root `beforeInteractive` script when hash had `type=recovery` (hash may be stripped before React runs). */
export function consumePasswordRecoveryBootstrapFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const v = sessionStorage.getItem(PW_RECOVERY_SESSION_STORAGE_KEY);
    if (v === "1") {
      sessionStorage.removeItem(PW_RECOVERY_SESSION_STORAGE_KEY);
      return true;
    }
  } catch {
    // sessionStorage blocked or quota
  }
  return false;
}

export function PasswordRecoveryUpdatePanel({
  supabase,
  recoverySaved,
  onRecoverySuccess,
}: {
  supabase: SupabaseClient;
  recoverySaved: boolean;
  onRecoverySuccess: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const form = useForm<PasswordRecoverySetFormValues>({
    resolver: zodResolver(passwordRecoverySetSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (values: PasswordRecoverySetFormValues) => {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (updateError) {
        throw updateError;
      }
    },
    onSuccess: () => {
      onRecoverySuccess();
    },
    onError: (err: unknown) => {
      const description =
        err instanceof Error
          ? err.message
          : typeof err === "object" &&
              err !== null &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Unbekannter Fehler";
      toast.error("Passwort konnte nicht gespeichert werden.", {
        description,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updatePassword.mutate(values);
  });

  if (recoverySaved) {
    return (
      <div className="flex flex-col items-center gap-8 py-2 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden
        >
          <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
        </div>
        <p className="font-medium text-foreground text-lg tracking-tight">
          Passwort erfolgreich geändert. Sie werden zur Anmeldung
          weitergeleitet...
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control as Control<PasswordRecoverySetFormValues>}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Neues Passwort</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    key={showPassword ? "pw-visible" : "pw-hidden"}
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-11 border-border bg-card pr-11 text-base text-foreground"
                  />
                </FormControl>
                <Button
                  key={showPassword ? "pw-toggle-show" : "pw-toggle-hide"}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleShowPassword();
                  }}
                  aria-label={
                    showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<PasswordRecoverySetFormValues>}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Passwort bestätigen</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    key={showConfirmPassword ? "pwc-visible" : "pwc-hidden"}
                    {...field}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-11 border-border bg-card pr-11 text-base text-foreground"
                  />
                </FormControl>
                <Button
                  key={
                    showConfirmPassword ? "pwc-toggle-show" : "pwc-toggle-hide"
                  }
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleShowConfirmPassword();
                  }}
                  aria-label={
                    showConfirmPassword
                      ? "Passwortbestätigung verbergen"
                      : "Passwortbestätigung anzeigen"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="h-11 w-full text-base"
          disabled={updatePassword.isPending}
        >
          {updatePassword.isPending
            ? "Wird gespeichert…"
            : "Neues Passwort speichern"}
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  const [view, setView] = useState<LoginAuthView>("sign_in");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [recoverySaved, setRecoverySaved] = useState(false);
  /** True only when the client has a recovery-capable session (never show update form before this). */
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  /** Latched after timeout when recovery UI was shown but no session could be established. */
  const [recoverySessionTimedOut, setRecoverySessionTimedOut] = useState(false);
  /** Recovery URL, bootstrap latch, recovery JWT, or password form — blocks authed redirect to dashboard. */
  const isRecoveryFlowRef = useRef(false);
  const recoveryTimeoutToastShownRef = useRef(false);
  const router = useRouter();

  const getRedirectPath = useCallback((): string => {
    if (typeof window === "undefined") return "/dashboard";

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo");

    if (redirectTo?.startsWith("/")) {
      return redirectTo;
    }
    return "/dashboard";
  }, []);

  const authRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "http://localhost:3000/login";

  // 1) Latch recovery from bootstrap + URL/hash (sync) before any Supabase client exists.
  useLayoutEffect(() => {
    const bootstrapRecovery = consumePasswordRecoveryBootstrapFlag();
    const urlRec = isPasswordRecoveryFromUrl();
    isRecoveryFlowRef.current =
      isRecoveryFlowRef.current || bootstrapRecovery || urlRec;
    if (bootstrapRecovery || urlRec) {
      setView("update_password");
    }
  }, []);

  // 2) One shared browser client after latch (singleton avoids Strict Mode double-init).
  useLayoutEffect(() => {
    setSupabase(getLoginPageSupabaseClient());
  }, []);

  useEffect(() => {
    if (view !== "update_password") {
      setRecoverySaved(false);
      setRecoverySessionReady(false);
      setRecoverySessionTimedOut(false);
      recoveryTimeoutToastShownRef.current = false;
    }
  }, [view]);

  useEffect(() => {
    if (view !== "update_password" || recoverySaved || recoverySessionReady) {
      return;
    }
    const id = window.setTimeout(() => {
      setRecoverySessionTimedOut(true);
      if (!recoveryTimeoutToastShownRef.current) {
        recoveryTimeoutToastShownRef.current = true;
        toast.error("Link ungültig oder abgelaufen.", {
          description:
            "Bitte fordern Sie einen neuen Zurücksetzen-Link an und öffnen Sie ihn erneut.",
        });
      }
    }, RECOVERY_SESSION_READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [view, recoverySaved, recoverySessionReady]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const urlRecovery = isPasswordRecoveryFromUrl();

    if (urlRecovery) {
      isRecoveryFlowRef.current = true;
      setView("update_password");
    }

    const redirectIfAuthed = () => {
      const path = getRedirectPath();
      startTransition(() => {
        router.replace(path);
      });
    };

    const applyRecoverySessionIfPresent = async (): Promise<void> => {
      await tryHydrateRecoverySessionFromHash(supabase);
      if (urlMayCarryRecoveryTokens()) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        await supabase.auth.getSession();
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 0);
        });
        await supabase.auth.getSession();
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tok = session?.access_token;
      if (typeof tok === "string" && accessTokenIndicatesRecovery(tok)) {
        isRecoveryFlowRef.current = true;
        setView("update_password");
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
      }
    };

    const runInitialCheck = async () => {
      await applyRecoverySessionIfPresent();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const jwtRecovery =
        typeof token === "string" && accessTokenIndicatesRecovery(token);
      if (user && jwtRecovery) {
        isRecoveryFlowRef.current = true;
        setView("update_password");
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
        return;
      }
      if (user && !isRecoveryFlowRef.current) {
        redirectIfAuthed();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryFlowRef.current = true;
        setView("update_password");
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
        return;
      }

      const tok = session?.access_token;
      const jwtRec =
        typeof tok === "string" && accessTokenIndicatesRecovery(tok);
      if (session && jwtRec) {
        isRecoveryFlowRef.current = true;
        setView("update_password");
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
        return;
      }

      if (
        session &&
        !isRecoveryFlowRef.current &&
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        redirectIfAuthed();
      }
    });

    void runInitialCheck();

    return () => subscription.unsubscribe();
  }, [router, getRedirectPath, supabase]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Hero Panel (desktop) ─── */}
      <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:w-[45%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/4 to-primary/8"
          aria-hidden="true"
        />

        <div className="relative">
          <Image
            src="/logo-light.png"
            alt="AquaDock"
            width={180}
            height={48}
            className="block h-10 w-auto object-contain dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.png"
            alt="AquaDock"
            width={180}
            height={48}
            className="hidden h-10 w-auto object-contain dark:block"
            priority
          />
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-sm text-3xl font-semibold leading-[1.15] tracking-tight text-foreground xl:text-4xl">
            Steer Your Waterfront Operations Forward
          </h1>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            The smart CRM for marinas, hotels, campsites, and watersports
            operators — effortless visibility, streamlined management, real-time
            insights.
          </p>
          <ul className="space-y-3.5 pt-2" aria-label="Key benefits">
            {(
              [
                "24/7 visibility across all operations",
                "Streamlined guest & rental management",
                "Real-time insights that drive revenue",
              ] as const
            ).map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-sm text-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Trusted by marinas & hospitality operators across Europe
        </p>
      </aside>

      {/* ─── Auth Panel ─── */}
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Image
            src="/logo-light.png"
            alt="AquaDock"
            width={160}
            height={40}
            className="block h-8 w-auto object-contain dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.png"
            alt="AquaDock"
            width={160}
            height={40}
            className="hidden h-8 w-auto object-contain dark:block"
            priority
          />
          <p className="text-sm text-muted-foreground">
            Smart operations for waterfront businesses
          </p>
        </div>

        <Card
          className={
            view === "update_password"
              ? "w-full max-w-lg py-6 shadow-sm"
              : "w-full max-w-md py-6 shadow-sm"
          }
        >
          <CardHeader className="space-y-1.5 pb-2 text-center sm:pb-4">
            {view === "update_password" ? (
              recoverySaved ? null : recoverySessionTimedOut &&
                !recoverySessionReady ? (
                <>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Link ungültig oder abgelaufen
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Bitte fordern Sie einen neuen Zurücksetzen-Link an und
                    öffnen Sie ihn aus der E-Mail erneut.
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Neues Passwort festlegen
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    {!recoverySessionReady ? (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                    <span>
                      {recoverySessionReady
                        ? "Wählen Sie ein sicheres Passwort, das Sie nirgends sonst nutzen."
                        : "Sitzung wird vorbereitet…"}
                    </span>
                  </CardDescription>
                </>
              )
            ) : (
              <>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Sign in
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Enter your credentials to access AquaDock CRM
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent
            className={
              view === "update_password"
                ? "space-y-4 px-4 pb-6 sm:px-8"
                : "space-y-4 px-4 pb-6 sm:px-6"
            }
          >
            {supabase ? (
              <LoginAuthErrorBoundary>
                {view === "update_password" ? (
                  recoverySessionTimedOut &&
                  !recoverySessionReady &&
                  !recoverySaved ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Wenn das Problem weiterhin besteht, prüfen Sie, ob der
                      Link vollständig geöffnet wurde, und wiederholen Sie den
                      Vorgang mit einem neuen Link.
                    </p>
                  ) : recoverySaved || recoverySessionReady ? (
                    <PasswordRecoveryUpdatePanel
                      supabase={supabase}
                      recoverySaved={recoverySaved}
                      onRecoverySuccess={() => {
                        isRecoveryFlowRef.current = false;
                        setRecoverySaved(true);
                        startTransition(() => {
                          router.replace("/login");
                        });
                      }}
                    />
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                      <span>Bitte einen Moment gedulden…</span>
                    </p>
                  )
                ) : (
                  <div
                    className={
                    "login-supabase-auth w-full [&_a]:text-muted-foreground! [&_a:hover]:text-foreground! " +
                    "[&_input]:border-border! [&_input]:bg-card! [&_input]:text-foreground! " +
                    "[&_input::placeholder]:text-muted-foreground! [&_label]:text-foreground! " +
                    "[&_p]:text-foreground!"
                    }
                  >
                    <Auth
                      supabaseClient={supabase}
                      view={view}
                      appearance={{
                        theme: ThemeSupa,
                        variables: {
                          default: loginAuthAppearanceVariables,
                        },
                      }}
                      providers={[]}
                      redirectTo={authRedirectTo}
                      onlyThirdPartyProviders={false}
                      magicLink={true}
                      showLinks={false}
                    />
                  </div>
                )}
              </LoginAuthErrorBoundary>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Wird geladen…
              </p>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
          Trusted by marinas & hospitality operators across Europe
        </p>
      </main>
    </div>
  );
}
