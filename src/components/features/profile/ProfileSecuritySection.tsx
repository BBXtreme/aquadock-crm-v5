// Display name, password, and email change (tabs; server actions + RHF + Zod + TanStack Mutation).

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { startTransition, useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import ProfileForm from "@/components/features/profile/ProfileForm";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateEmailAction, updatePasswordAction } from "@/lib/actions/profile";
import { useT } from "@/lib/i18n/use-translations";
import {
  type ChangeEmailFormValues,
  type ChangePasswordFormValues,
  changeEmailSchema,
  changePasswordSchema,
} from "@/lib/validations/profile";
import type { Profile } from "@/types/database.types";

type ProfileSecuritySectionProps = {
  currentEmail: string;
  profile: Profile;
};

/** Enough time for `router.refresh()` before returning to the form panel. */
const SUCCESS_PANEL_RESET_MS = 2800;

function changeErrorDescription(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

function PasswordFieldWithToggle({
  field,
  show,
  onToggle,
  hideLabel,
  showLabel,
}: {
  field: ComponentProps<typeof Input>;
  show: boolean;
  onToggle: () => void;
  hideLabel: string;
  showLabel: string;
}) {
  return (
    <div className="relative">
      <FormControl>
        <Input
          {...field}
          type={show ? "text" : "password"}
          className="h-11 pr-11 text-base"
        />
      </FormControl>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 h-11 w-11 text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        aria-label={show ? hideLabel : showLabel}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function ProfileSecuritySection({
  currentEmail,
  profile,
}: ProfileSecuritySectionProps) {
  const t = useT("profile");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [emailRequestSent, setEmailRequestSent] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  const emailForm = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      new_email: "",
    },
  });

  useEffect(() => {
    if (!passwordSaved) {
      return;
    }
    const id = window.setTimeout(() => {
      setPasswordSaved(false);
    }, SUCCESS_PANEL_RESET_MS);
    return () => window.clearTimeout(id);
  }, [passwordSaved]);

  useEffect(() => {
    if (!emailRequestSent) {
      return;
    }
    const id = window.setTimeout(() => {
      setEmailRequestSent(false);
    }, SUCCESS_PANEL_RESET_MS);
    return () => window.clearTimeout(id);
  }, [emailRequestSent]);

  const passwordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormValues) => {
      const fd = new FormData();
      fd.append("new_password", data.new_password);
      fd.append("confirm_password", data.confirm_password);
      await updatePasswordAction(fd);
    },
    onSuccess: () => {
      setPasswordSaved(true);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      passwordForm.reset({
        new_password: "",
        confirm_password: "",
      });
      toast.success(t("toastPasswordChanged"));
      queryClient.invalidateQueries();
      startTransition(() => {
        router.refresh();
      });
    },
    onError: (err: unknown) => {
      toast.error(t("toastChangeSaveFailed"), {
        description: changeErrorDescription(err, t("toastChangeErrorUnknown")),
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: ChangeEmailFormValues) => {
      const fd = new FormData();
      fd.append("new_email", data.new_email);
      await updateEmailAction(fd);
    },
    onSuccess: () => {
      setEmailRequestSent(true);
      emailForm.reset({ new_email: "" });
      toast.success(t("toastEmailConfirmationRequested"), {
        description: t("toastEmailConfirmationDescription"),
      });
      queryClient.invalidateQueries();
      startTransition(() => {
        router.refresh();
      });
    },
    onError: (err: unknown) => {
      toast.error(t("toastChangeSaveFailed"), {
        description: changeErrorDescription(err, t("toastChangeErrorUnknown")),
      });
    },
  });

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    passwordMutation.mutate(values);
  });

  const onEmailSubmit = emailForm.handleSubmit((values) => {
    emailMutation.mutate(values);
  });

  const labelClass = "text-sm font-medium";

  return (
    <div className="w-full">
      <Tabs defaultValue="display" className="w-full">
        <TabsList variant="line" className="w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="display" className="px-4">
            {t("tabDisplayName")}
          </TabsTrigger>
          <TabsTrigger value="password" className="px-4">
            {t("tabPassword")}
          </TabsTrigger>
          <TabsTrigger value="email" className="px-4">
            {t("tabEmail")}
          </TabsTrigger>
        </TabsList>
        <Separator className="my-3" />
        <TabsContent value="display" className="space-y-6 pt-1">
          <div className="space-y-1">
            <h3
              id="profile-display-heading"
              className="font-heading font-semibold text-foreground text-sm tracking-tight sm:text-base"
            >
              {t("securityDisplayHeading")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("securityDisplayDescription")}
            </p>
          </div>
          <ProfileForm profile={profile} />
        </TabsContent>
        <TabsContent value="password" className="space-y-6 pt-1">
          {passwordSaved ? (
            <div className="flex flex-col items-center gap-8 py-2 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
                aria-hidden
              >
                <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
              </div>
              <p className="font-medium text-foreground text-lg tracking-tight">
                {t("passwordSuccessPanelMessage")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h3
                  id="profile-password-panel-heading"
                  className="font-heading font-semibold text-foreground text-sm tracking-tight sm:text-base"
                >
                  {t("securityPasswordHeading")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("securityPasswordDescription")}
                </p>
              </div>
              <Form {...passwordForm}>
                <form
                  onSubmit={onPasswordSubmit}
                  className="space-y-6"
                  aria-labelledby="profile-password-panel-heading"
                >
                  <FormField
                    control={
                      passwordForm.control as Control<ChangePasswordFormValues>
                    }
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          {t("labelNewPassword")}
                        </FormLabel>
                        <PasswordFieldWithToggle
                          field={{
                            ...field,
                            autoComplete: "new-password",
                          }}
                          show={showNewPassword}
                          onToggle={() => {
                            setShowNewPassword((v) => !v);
                          }}
                          hideLabel={t("ariaHideNewPassword")}
                          showLabel={t("ariaShowNewPassword")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={
                      passwordForm.control as Control<ChangePasswordFormValues>
                    }
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          {t("labelConfirmPassword")}
                        </FormLabel>
                        <PasswordFieldWithToggle
                          field={{
                            ...field,
                            autoComplete: "new-password",
                          }}
                          show={showConfirmPassword}
                          onToggle={() => {
                            setShowConfirmPassword((v) => !v);
                          }}
                          hideLabel={t("ariaHideConfirmPassword")}
                          showLabel={t("ariaShowConfirmPassword")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full text-base"
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending
                      ? t("updateProfilePending")
                      : t("submitSavePassword")}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </TabsContent>
        <TabsContent value="email" className="space-y-6 pt-1">
          {emailRequestSent ? (
            <div className="flex flex-col items-center gap-8 py-2 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
                aria-hidden
              >
                <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
              </div>
              <p className="font-medium text-foreground text-lg tracking-tight">
                {t("emailSuccessPanelMessage")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h3
                  id="profile-email-panel-heading"
                  className="font-heading font-semibold text-foreground text-sm tracking-tight sm:text-base"
                >
                  {t("securityEmailHeading")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("securityEmailDescription", {
                    currentEmail,
                  })}
                </p>
              </div>
              <Form {...emailForm}>
                <form
                  onSubmit={onEmailSubmit}
                  className="space-y-6"
                  aria-labelledby="profile-email-panel-heading"
                >
                  <FormField
                    control={emailForm.control as Control<ChangeEmailFormValues>}
                    name="new_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          {t("labelNewEmail")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            className="h-11 text-base"
                            placeholder={t("placeholderNewEmail")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full text-base"
                    disabled={emailMutation.isPending}
                  >
                    {emailMutation.isPending
                      ? t("updateProfilePending")
                      : t("submitRequestEmailChange")}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
