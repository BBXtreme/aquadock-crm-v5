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
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
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

type LoginAuthView = "sign_in" | "sign_up" | "update_password";

/** Thrown after `updateUser` succeeds so `onError` can skip the generic save toast. */
class SignInAfterPasswordUpdateError extends Error {
  override readonly name = "SignInAfterPasswordUpdateError";
}

type LoginAuthErrorBoundaryProps = { children: ReactNode };

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

function isPasswordRecoveryFromUrl(): boolean {
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
function consumePasswordRecoveryBootstrapFlag(): boolean {
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

function PasswordRecoveryUpdatePanel({
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

  const form = useForm<PasswordRecoverySetFormValues>({
    resolver: zodResolver(passwordRecoverySetSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (values: PasswordRecoverySetFormValues) => {
      const {
        data: { user: beforeUser },
      } = await supabase.auth.getUser();
      const email = beforeUser?.email?.trim();
      if (email === undefined || email === "") {
        throw new Error("Keine E-Mail für die Anmeldung gefunden.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (updateError) {
        throw updateError;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });
      if (signInError) {
        toast.error(
          "Passwort wurde geändert, die automatische Anmeldung ist fehlgeschlagen.",
          {
            description: signInError.message,
          },
        );
        throw new SignInAfterPasswordUpdateError(signInError.message);
      }
    },
    onSuccess: () => {
      onRecoverySuccess();
    },
    onError: (err: unknown) => {
      if (err instanceof SignInAfterPasswordUpdateError) {
        return;
      }
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
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        >
          <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
        </div>
        <p className="font-medium text-foreground text-lg tracking-tight">
          Passwort erfolgreich geändert. Weiterleitung...
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
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-11 pr-11 text-base"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowPassword((v) => !v);
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
                    {...field}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-11 pr-11 text-base"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowConfirmPassword((v) => !v);
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
          className="h-11 w-full bg-[#24BACC] text-base text-white transition-colors hover:bg-[#1da0a8]"
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
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  /** Recovery URL, bootstrap latch, recovery JWT, or password form — blocks authed redirect to dashboard. */
  const isInRecoveryFlowRef = useRef(false);

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

  useLayoutEffect(() => {
    const bootstrapRecovery = consumePasswordRecoveryBootstrapFlag();
    if (bootstrapRecovery) {
      isInRecoveryFlowRef.current = true;
    }
    const recovery =
      isPasswordRecoveryFromUrl() ||
      isInRecoveryFlowRef.current ||
      bootstrapRecovery;
    if (recovery) {
      isInRecoveryFlowRef.current = true;
      setView("update_password");
    }
    setSupabase((prev) => prev ?? createClient());
  }, []);

  useEffect(() => {
    if (view !== "update_password") {
      setRecoverySaved(false);
    }
  }, [view]);

  useEffect(() => {
    if (!recoverySaved || view !== "update_password") {
      return;
    }
    const id = window.setTimeout(() => {
      startTransition(() => {
        router.replace("/dashboard");
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [recoverySaved, view, router]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const urlRecovery = isPasswordRecoveryFromUrl();

    if (urlRecovery) {
      isInRecoveryFlowRef.current = true;
      setView("update_password");
    }

    const redirectIfAuthed = () => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      const path = getRedirectPath();
      startTransition(() => {
        router.replace(path);
      });
    };

    const runInitialCheck = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const jwtRecovery =
        typeof token === "string" && accessTokenIndicatesRecovery(token);
      if (user && !isInRecoveryFlowRef.current && jwtRecovery) {
        isInRecoveryFlowRef.current = true;
        setView("update_password");
      }
      if (user && !isInRecoveryFlowRef.current) {
        redirectIfAuthed();
      }
    };

    void runInitialCheck();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        isInRecoveryFlowRef.current = true;
        setView("update_password");
        return;
      }

      if (
        session &&
        !isInRecoveryFlowRef.current &&
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        const tok = session.access_token;
        if (tok && accessTokenIndicatesRecovery(tok)) {
          isInRecoveryFlowRef.current = true;
          setView("update_password");
          return;
        }
        redirectIfAuthed();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, getRedirectPath, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card
        className={
          view === "update_password"
            ? "w-full max-w-lg rounded-2xl border border-border bg-card px-2 py-1 text-card-foreground shadow-lg sm:px-4"
            : "w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-sm"
        }
      >
        <CardHeader className="space-y-2 pb-2 text-center sm:pb-4">
          {view === "update_password" ? (
            recoverySaved ? null : (
              <>
                <CardTitle className="font-semibold text-3xl tracking-tight">
                  Neues Passwort festlegen
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Wählen Sie ein sicheres Passwort, das Sie nirgends sonst nutzen.
                </CardDescription>
              </>
            )
          ) : (
            <CardTitle className="font-semibold text-2xl">
              Sign In to AquaDock CRM
            </CardTitle>
          )}
        </CardHeader>
        <CardContent
          className={
            view === "update_password"
              ? "space-y-4 px-4 pb-8 sm:px-8"
              : "space-y-4"
          }
        >
          {view !== "update_password" ? (
            <div className="mb-4 flex justify-center space-x-2">
              <Button
                variant={view === "sign_in" ? "default" : "outline"}
                onClick={() => setView("sign_in")}
                className="flex-1"
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                disabled
                className="flex-1 opacity-50"
              >
                Sign Up
              </Button>
            </div>
          ) : null}

          {supabase ? (
            <LoginAuthErrorBoundary>
              {view === "update_password" ? (
                <PasswordRecoveryUpdatePanel
                  supabase={supabase}
                  recoverySaved={recoverySaved}
                  onRecoverySuccess={() => {
                    isInRecoveryFlowRef.current = false;
                    hasRedirectedRef.current = true;
                    setRecoverySaved(true);
                    startTransition(() => {
                      router.replace("/dashboard");
                    });
                  }}
                />
              ) : (
                <Auth
                  supabaseClient={supabase}
                  view={view}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: "#24BACC",
                          brandAccent: "#1da0a8",
                        },
                      },
                    },
                  }}
                  providers={[]}
                  redirectTo={authRedirectTo}
                  onlyThirdPartyProviders={false}
                  magicLink={true}
                  showLinks={false}
                />
              )}
            </LoginAuthErrorBoundary>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              Wird geladen…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
