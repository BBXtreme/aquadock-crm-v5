// src/components/features/profile/ProfileSecuritySection.tsx
// Self-service password and email change (server actions + RHF + Zod + TanStack Mutation).

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateEmailAction, updatePasswordAction } from "@/lib/actions/profile";
import {
  type ChangeEmailFormValues,
  type ChangePasswordFormValues,
  changeEmailSchema,
  changePasswordSchema,
} from "@/lib/validations/profile";

type ProfileSecuritySectionProps = {
  currentEmail: string;
};

/** Genug Zeit für `router.refresh()`, damit das Panel wie auf `/login` wirkt, dann zurück zum Formular. */
const SUCCESS_PANEL_RESET_MS = 2800;

function changeErrorDescription(err: unknown): string {
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
  return "Unbekannter Fehler";
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
}: ProfileSecuritySectionProps) {
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
      toast.success("Passwort wurde erfolgreich geändert.");
      queryClient.invalidateQueries();
      startTransition(() => {
        router.refresh();
      });
    },
    onError: (err: unknown) => {
      toast.error("Änderung konnte nicht gespeichert werden.", {
        description: changeErrorDescription(err),
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
      toast.success("Bestätigung angefordert", {
        description:
          "Bitte prüfen Sie beide E-Mail-Postfächer und folgen Sie den Links in den Nachrichten.",
      });
      queryClient.invalidateQueries();
      startTransition(() => {
        router.refresh();
      });
    },
    onError: (err: unknown) => {
      toast.error("Änderung konnte nicht gespeichert werden.", {
        description: changeErrorDescription(err),
      });
    },
  });

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    passwordMutation.mutate(values);
  });

  const onEmailSubmit = emailForm.handleSubmit((values) => {
    emailMutation.mutate(values);
  });

  return (
    <div className="w-full">
      <Tabs defaultValue="password" className="w-full">
        <TabsList variant="line" className="mb-1 w-full justify-start gap-1">
          <TabsTrigger value="password" className="px-4">
            Passwort ändern
          </TabsTrigger>
          <TabsTrigger value="email" className="px-4">
            E-Mail ändern
          </TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="space-y-6 pt-4">
          {passwordSaved ? (
            <div className="flex flex-col items-center gap-8 py-2 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              >
                <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
              </div>
              <p className="font-medium text-foreground text-lg tracking-tight">
                Passwort erfolgreich geändert. Profil wird
                aktualisiert...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h3
                  id="profile-password-panel-heading"
                  className="font-heading font-semibold text-foreground text-sm tracking-tight sm:text-base"
                >
                  Neues Passwort festlegen
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Geben Sie Ihr neues Passwort zweimal ein. Nach dem Speichern
                  gilt es sofort; Ihre aktuelle Sitzung bleibt bestehen.
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
                        <FormLabel className="text-base">
                          Neues Passwort
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
                          hideLabel="Neues Passwort verbergen"
                          showLabel="Neues Passwort anzeigen"
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
                        <FormLabel className="text-base">
                          Passwort bestätigen
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
                          hideLabel="Passwortbestätigung verbergen"
                          showLabel="Passwortbestätigung anzeigen"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full bg-[#24BACC] text-base text-white transition-colors hover:bg-[#1da0a8]"
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending
                      ? "Wird gespeichert…"
                      : "Neues Passwort speichern"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </TabsContent>
        <TabsContent value="email" className="space-y-4 pt-4">
          {emailRequestSent ? (
            <div className="flex flex-col items-center gap-8 py-2 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              >
                <CheckCircle2 className="h-11 w-11 shrink-0" strokeWidth={1.75} />
              </div>
              <p className="font-medium text-foreground text-lg tracking-tight">
                Bestätigungs-E-Mails sind unterwegs. Bitte prüfen Sie Ihre
                Postfächer...
              </p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Zur Bestätigung wird eine E-Mail an{" "}
                <span className="font-medium text-foreground">
                  {currentEmail}
                </span>{" "}
                und an Ihre neue Adresse gesendet.
              </p>
              <Form {...emailForm}>
                <form onSubmit={onEmailSubmit} className="space-y-6">
                  <FormField
                    control={emailForm.control as Control<ChangeEmailFormValues>}
                    name="new_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">
                          Neue E-Mail-Adresse
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            className="h-11 text-base"
                            placeholder="name@beispiel.de"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full bg-[#24BACC] text-base text-white transition-colors hover:bg-[#1da0a8]"
                    disabled={emailMutation.isPending}
                  >
                    {emailMutation.isPending
                      ? "Wird gespeichert…"
                      : "E-Mail-Änderung anfordern"}
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
