// src/components/features/auth/PartnerLoginForm.tsx
//
// Custom partner sign-in form (React Hook Form + Zod). Posts JSON to the
// shared `/auth/login` Route Handler so internal `/login` and `/partner/login`
// share one backend.
//
// Visual identity is intentionally distinct from the internal CRM:
//   - rounded card on warm canvas surface
//   - ocean teal accents instead of generic CRM primary
//   - generous spacing and editorial typography

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useT } from "@/lib/i18n/use-translations";
import {
  type PartnerLoginFormValues,
  partnerLoginFormSchema,
} from "@/lib/validations/auth-login";

type LoginSuccessBody = { ok: true; redirectTo: string };
type LoginErrorBody = {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function isRelativePath(value: string | null): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function PartnerLoginForm() {
  const t = useT("partnerLogin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<PartnerLoginFormValues>({
    resolver: zodResolver(partnerLoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = useCallback(
    async (values: PartnerLoginFormValues) => {
      setServerError(null);

      const redirectToParam = searchParams.get("redirectTo");
      const payload: {
        email: string;
        password: string;
        remember: boolean;
        redirectTo?: string;
      } = {
        email: values.email,
        password: values.password,
        remember: values.remember,
      };
      if (isRelativePath(redirectToParam)) {
        payload.redirectTo = redirectToParam;
      }

      try {
        const response = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data: LoginSuccessBody | LoginErrorBody = await response.json();

        if (!data.ok) {
          const message =
            data.code === "invalid_credentials"
              ? t("errorInvalidCredentials")
              : data.code === "validation_error"
                ? t("errorValidation")
                : t("errorUnexpected");
          setServerError(message);
          toast.error(message);
          return;
        }

        toast.success(t("toastSuccess"));
        startTransition(() => {
          router.replace(data.redirectTo);
        });
      } catch {
        const message = t("errorNetwork");
        setServerError(message);
        toast.error(message);
      }
    },
    [router, searchParams, t],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <section
      className="rounded-2xl border bg-(--partner-canvas) p-6 sm:p-7"
      style={{
        borderColor: "var(--partner-hairline)",
      }}
    >
      <header className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-(--partner-ink)">
          {t("formTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-(--partner-ink-soft)">
          {t("formSubtitle")}
        </p>
      </header>

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <FormField
            control={form.control as Control<PartnerLoginFormValues>}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: "var(--partner-ink)" }}>
                  {t("emailLabel")}
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    placeholder={t("emailPlaceholder")}
                    className="block h-12 w-full rounded-xl border bg-white px-4 text-base outline-none transition-all focus-visible:ring-2"
                    style={{
                      borderColor: "var(--partner-hairline)",
                      color: "var(--partner-ink)",
                      // Focus ring via accent token.
                      ["--tw-ring-color" as string]: "var(--partner-accent)",
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as Control<PartnerLoginFormValues>}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: "var(--partner-ink)" }}>
                  {t("passwordLabel")}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder={t("passwordPlaceholder")}
                      className="block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-base outline-none transition-all focus-visible:ring-2"
                      style={{
                        borderColor: "var(--partner-hairline)",
                        color: "var(--partner-ink)",
                        ["--tw-ring-color" as string]: "var(--partner-accent)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword
                          ? t("hidePassword")
                          : t("showPassword")
                      }
                      className="absolute inset-y-0 right-3 grid place-items-center text-sm"
                      style={{ color: "var(--partner-ink-soft)" }}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" aria-hidden />
                      ) : (
                        <Eye className="size-5" aria-hidden />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <FormField
              control={form.control as Control<PartnerLoginFormValues>}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(value) => field.onChange(value === true)}
                      aria-label={t("rememberLabel")}
                    />
                  </FormControl>
                  <FormLabel
                    className="text-sm font-medium"
                    style={{ color: "var(--partner-ink-soft)" }}
                  >
                    {t("rememberLabel")}
                  </FormLabel>
                </FormItem>
              )}
            />
            <a
              href="/apply"
              className="text-sm font-medium underline-offset-4 transition-colors hover:underline"
              style={{ color: "var(--partner-accent-strong)" }}
            >
              {t("forgotPassword")}
            </a>
          </div>

          {serverError !== null ? (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.08)",
                color: "#b91c1c",
              }}
            >
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold tracking-tight transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: "var(--partner-cta)",
              color: "white",
              fontFamily: "var(--font-montserrat, inherit)",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : null}
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </form>
      </Form>
    </section>
  );
}
