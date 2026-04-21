"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { registerPendingUserAfterSignup } from "@/lib/actions/onboarding";
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
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { accessRequestSchema } from "@/lib/validations/access-request";

export default function ApplyPage() {
  const t = useT("onboarding");
  const tLogin = useT("login");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
      display_name: "",
    },
  });

  const onSubmit = form.handleSubmit(async (raw) => {
    const parsed = accessRequestSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = `${origin}/access-pending`;
      const { error: signErr } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo,
          data: {
            display_name: parsed.data.display_name,
          },
        },
      });
      if (signErr !== null) {
        toast.error(t("toastSignUpFailed"), { description: signErr.message });
        return;
      }
      try {
        await registerPendingUserAfterSignup(parsed.data.display_name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(t("toastRegisterFailed"), { description: msg });
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  });

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle>{t("successTitle")}</CardTitle>
            <CardDescription>{t("successDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">{tLogin("signInTitle")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>{t("applyTitle")}</CardTitle>
          <CardDescription>{t("applyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("displayNameLabel")}</FormLabel>
                    <FormControl>
                      <Input className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={submitting}
              >
                {submitting ? t("submitting") : t("submit")}
              </Button>
              <p className="text-center text-muted-foreground text-sm">
                <Link href="/login" className="underline">
                  {tLogin("signInTitle")}
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
