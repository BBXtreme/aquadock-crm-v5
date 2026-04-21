"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/use-translations";
import {
  type PasswordRecoverySetFormValues,
  passwordRecoverySetSchema,
} from "@/lib/validations/profile";

export function PasswordRecoveryUpdatePanel({
  supabase,
  recoverySaved,
  onRecoverySuccess,
}: {
  supabase: SupabaseClient;
  recoverySaved: boolean;
  onRecoverySuccess: () => void;
}) {
  const t = useT("login");
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
            : "Unknown error";
      toast.error(t("recoveryErrorToast"), {
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
          {t("recoverySuccess")}
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
              <FormLabel className="text-base">
                {t("recoveryNewPasswordLabel")}
              </FormLabel>
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
                    showPassword ? t("hidePassword") : t("showPassword")
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
              <FormLabel className="text-base">
                {t("recoveryConfirmPasswordLabel")}
              </FormLabel>
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
                      ? t("hideConfirmPassword")
                      : t("showConfirmPassword")
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
            ? t("recoverySaving")
            : t("recoverySaveButton")}
        </Button>
      </form>
    </Form>
  );
}
