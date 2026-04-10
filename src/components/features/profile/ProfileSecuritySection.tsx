// src/components/features/profile/ProfileSecuritySection.tsx
// Self-service password and email change inside the profile card (server actions + RHF + Zod).

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useState } from "react";
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

function PasswordFieldWithToggle({
  field,
  show,
  onToggle,
  hideLabel,
  showLabel,
  inputClassName,
}: {
  field: ComponentProps<typeof Input>;
  show: boolean;
  onToggle: () => void;
  hideLabel: string;
  showLabel: string;
  inputClassName?: string;
}) {
  return (
    <div className="relative">
      <FormControl>
        <Input
          {...field}
          type={show ? "text" : "password"}
          className={inputClassName ?? "h-11 pr-11"}
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
  const [passwordPending, setPasswordPending] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
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

  const onPasswordSubmit = passwordForm.handleSubmit(async (data) => {
    setPasswordPending(true);
    try {
      const fd = new FormData();
      fd.append("current_password", data.current_password);
      fd.append("new_password", data.new_password);
      fd.append("confirm_password", data.confirm_password);
      await updatePasswordAction(fd);
      setPasswordSaved(true);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Passwort konnte nicht geändert werden.";
      toast.error("Passwortänderung fehlgeschlagen", { description: message });
    } finally {
      setPasswordPending(false);
    }
  });

  const dismissPasswordSuccess = () => {
    setPasswordSaved(false);
    passwordForm.reset({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
  };

  const onEmailSubmit = emailForm.handleSubmit(async (data) => {
    setEmailPending(true);
    try {
      const fd = new FormData();
      fd.append("new_email", data.new_email);
      await updateEmailAction(fd);
      toast.success("Bestätigung angefordert", {
        description:
          "Bitte prüfen Sie beide E-Mail-Postfächer und folgen Sie den Links in den Nachrichten.",
      });
      emailForm.reset({ new_email: "" });
      queryClient.invalidateQueries();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "E-Mail konnte nicht geändert werden.";
      toast.error("E-Mail-Änderung fehlgeschlagen", { description: message });
    } finally {
      setEmailPending(false);
    }
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
        <TabsContent value="password" className="space-y-4 pt-4">
          {passwordSaved ? (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              >
                <CheckCircle2 className="h-9 w-9 shrink-0" strokeWidth={1.75} />
              </div>
              <p className="max-w-sm font-medium text-foreground text-sm leading-relaxed">
                Ihr Passwort wurde erfolgreich geändert. Sie können es ab sofort
                für die Anmeldung verwenden.
              </p>
              <Button
                type="button"
                className="min-w-[200px] bg-[#24BACC] text-white transition-colors hover:bg-[#1da0a8]"
                onClick={dismissPasswordSuccess}
              >
                Fertig
              </Button>
            </div>
          ) : (
            <Form {...passwordForm}>
              <form onSubmit={onPasswordSubmit} className="space-y-4">
                <FormField
                  control={
                    passwordForm.control as Control<ChangePasswordFormValues>
                  }
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Aktuelles Passwort
                      </FormLabel>
                      <PasswordFieldWithToggle
                        field={{
                          ...field,
                          autoComplete: "current-password",
                        }}
                        show={showCurrentPassword}
                        onToggle={() => {
                          setShowCurrentPassword((v) => !v);
                        }}
                        hideLabel="Aktuelles Passwort verbergen"
                        showLabel="Aktuelles Passwort anzeigen"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={
                    passwordForm.control as Control<ChangePasswordFormValues>
                  }
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
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
                      <FormLabel className="text-sm font-medium">
                        Neues Passwort bestätigen
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
                  className="h-11 w-full bg-[#24BACC] text-white transition-colors hover:bg-[#1da0a8]"
                  disabled={passwordPending}
                >
                  {passwordPending ? "Wird gespeichert…" : "Passwort speichern"}
                </Button>
              </form>
            </Form>
          )}
        </TabsContent>
        <TabsContent value="email" className="space-y-4 pt-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Zur Bestätigung wird eine E-Mail an{" "}
            <span className="font-medium text-foreground">{currentEmail}</span>{" "}
            und an Ihre neue Adresse gesendet.
          </p>
          <Form {...emailForm}>
            <form onSubmit={onEmailSubmit} className="space-y-4">
              <FormField
                control={emailForm.control as Control<ChangeEmailFormValues>}
                name="new_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Neue E-Mail-Adresse
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        className="h-11"
                        placeholder="name@beispiel.de"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="h-11 w-full bg-[#24BACC] text-white transition-colors hover:bg-[#1da0a8]"
                disabled={emailPending}
              >
                {emailPending ? "Wird gesendet…" : "E-Mail-Änderung anfordern"}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
