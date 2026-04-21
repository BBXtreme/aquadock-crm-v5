"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { performBrowserSignOutToLogin } from "@/lib/auth/browser-sign-out";
import { useT } from "@/lib/i18n/use-translations";

export default function AccessDeniedPage() {
  const t = useT("onboarding");
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>{t("accessDeniedTitle")}</CardTitle>
          <CardDescription>{t("accessDeniedDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="h-11 w-full"
            type="button"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void (async () => {
                const ok = await performBrowserSignOutToLogin();
                if (!ok) {
                  setPending(false);
                }
              })();
            }}
          >
            <LogOut className="mr-2 h-5 w-5" />
            {t("signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
