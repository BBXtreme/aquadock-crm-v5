// src/app/(auth)/login/page.tsx
// Login + password recovery. Next.js SSR initial state has no `window`, so we must not
// call createClient() until useLayoutEffect reads the hash (tokens) first; otherwise the
// client consumes the hash while view stays "sign_in" from hydration (Vercel symptom).

"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthFormErrorBoundary } from "@/components/features/auth/AuthFormErrorBoundary";
import { PasswordRecoveryUpdatePanel } from "@/components/features/auth/PasswordRecoveryUpdatePanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  accessTokenIndicatesRecovery,
  consumePasswordRecoveryBootstrapFlag,
  isPasswordRecoveryFromUrl,
  RECOVERY_SESSION_READY_TIMEOUT_MS,
  tryHydrateRecoverySessionFromHash,
  urlMayCarryRecoveryTokens,
} from "@/lib/auth/password-recovery-browser";
import { useT } from "@/lib/i18n/use-translations";
import { getAuthBrowserSingletonClient } from "@/lib/supabase/auth-browser-singleton";

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

type LoginAuthView = "sign_in" | "sign_up" | "update_password";

export default function LoginPage() {
  const t = useT("login");
  const [view, setView] = useState<LoginAuthView>("sign_in");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  /** Browser client failed to construct (usually missing NEXT_PUBLIC_* in the built bundle). */
  const [supabaseClientMissing, setSupabaseClientMissing] = useState(false);
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
    try {
      setSupabase(getAuthBrowserSingletonClient());
    } catch {
      setSupabaseClientMissing(true);
    }
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
        toast.error(t("recoveryTimeoutToastTitle"), {
          description: t("recoveryTimeoutToastDescription"),
        });
      }
    }, RECOVERY_SESSION_READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [view, recoverySaved, recoverySessionReady, t]);

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
            {t("heroTitle")}
          </h1>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            {t("heroDescription")}
          </p>
          <ul className="space-y-3.5 pt-2" aria-label="Key benefits">
            {(["benefit1", "benefit2", "benefit3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-sm text-foreground">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          {t("trustStatement")}
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
            {t("mobileTagline")}
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
                    {t("recoveryLinkExpiredTitle")}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t("recoveryLinkExpiredDescription")}
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    {t("recoverySetTitle")}
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
                        ? t("recoverySetDescription")
                        : t("recoverySessionPreparing")}
                    </span>
                  </CardDescription>
                </>
              )
            ) : (
              <>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  {t("signInTitle")}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("signInDescription")}
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
            {supabaseClientMissing ? (
              <p
                role="alert"
                className="text-center text-sm text-destructive"
                data-testid="login-supabase-init-error"
              >
                <span className="font-medium">{t("supabaseClientInitTitle")}</span>
                <span className="mt-2 block text-muted-foreground">{t("supabaseClientInitHint")}</span>
              </p>
            ) : supabase ? (
              <AuthFormErrorBoundary
                errorToast={t("errorBoundaryToast")}
                reloadMessage={t("errorBoundaryReload")}
              >
                {view === "update_password" ? (
                  recoverySessionTimedOut &&
                  !recoverySessionReady &&
                  !recoverySaved ? (
                    <p className="text-center text-sm text-muted-foreground">
                      {t("recoveryPersistentError")}
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
                      <span>{t("recoveryPleaseWait")}</span>
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
              </AuthFormErrorBoundary>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {t("loading")}
              </p>
            )}
          </CardContent>
        </Card>

        {view !== "update_password" ? (
          <p className="mt-4 text-center text-sm">
            <Link
              href="/apply"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("applyForAccess")}
            </Link>
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
          {t("trustStatement")}
        </p>
      </main>
    </div>
  );
}

export { PasswordRecoveryUpdatePanel } from "@/components/features/auth/PasswordRecoveryUpdatePanel";
export {
  consumePasswordRecoveryBootstrapFlag,
  isPasswordRecoveryFromUrl,
} from "@/lib/auth/password-recovery-browser";
