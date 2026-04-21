// Dedicated recovery target for onboarding + admin-created users (`redirectTo` → `/set-password`).
// Success: session already established → redirect to dashboard (not `/login`).

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
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
import { toast } from "sonner";

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

type LoginAuthErrorBoundaryProps = {
  children: ReactNode;
  errorToast: string;
  reloadMessage: string;
};

type LoginAuthErrorBoundaryState = { didCatch: boolean };

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
      error instanceof Error ? error.message : "Unknown error";
    toast.error(this.props.errorToast, {
      description: message,
    });
  }

  render() {
    if (this.state.didCatch) {
      return (
        <p className="text-center text-muted-foreground text-sm">
          {this.props.reloadMessage}
        </p>
      );
    }
    return this.props.children;
  }
}

export default function SetPasswordPage() {
  const t = useT("login");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const [recoverySessionTimedOut, setRecoverySessionTimedOut] = useState(false);
  const isRecoveryFlowRef = useRef(false);
  const recoveryTimeoutToastShownRef = useRef(false);
  const router = useRouter();

  useLayoutEffect(() => {
    const bootstrapRecovery = consumePasswordRecoveryBootstrapFlag();
    const urlRec = isPasswordRecoveryFromUrl();
    isRecoveryFlowRef.current =
      isRecoveryFlowRef.current || bootstrapRecovery || urlRec;
  }, []);

  useLayoutEffect(() => {
    setSupabase(getAuthBrowserSingletonClient());
  }, []);

  useEffect(() => {
    if (recoverySaved || recoverySessionReady) {
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
  }, [recoverySaved, recoverySessionReady, t]);

  const redirectToDashboard = useCallback(() => {
    startTransition(() => {
      router.replace("/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const urlRecovery = isPasswordRecoveryFromUrl();
    if (urlRecovery) {
      isRecoveryFlowRef.current = true;
    }

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
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
        return;
      }
      if (user && !isRecoveryFlowRef.current) {
        redirectToDashboard();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryFlowRef.current = true;
        setRecoverySessionTimedOut(false);
        setRecoverySessionReady(true);
        return;
      }

      const tok = session?.access_token;
      const jwtRec =
        typeof tok === "string" && accessTokenIndicatesRecovery(tok);
      if (session && jwtRec) {
        isRecoveryFlowRef.current = true;
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
        redirectToDashboard();
      }
    });

    void runInitialCheck();

    return () => subscription.unsubscribe();
  }, [redirectToDashboard, supabase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-lg py-6 shadow-sm">
        <CardHeader className="space-y-1.5 pb-2 text-center sm:pb-4">
          {recoverySaved ? null : recoverySessionTimedOut && !recoverySessionReady ? (
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
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8">
          {supabase ? (
            <LoginAuthErrorBoundary
              errorToast={t("errorBoundaryToast")}
              reloadMessage={t("errorBoundaryReload")}
            >
              {recoverySessionTimedOut && !recoverySessionReady && !recoverySaved ? (
                <p className="text-center text-sm text-muted-foreground">
                  {t("recoveryPersistentError")}
                </p>
              ) : recoverySaved || recoverySessionReady ? (
                <PasswordRecoveryUpdatePanel
                  supabase={supabase}
                  recoverySaved={recoverySaved}
                  onRecoverySuccess={() => {
                    isRecoveryFlowRef.current = false;
                    startTransition(() => {
                      router.replace("/dashboard");
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
              )}
            </LoginAuthErrorBoundary>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t("loading")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
