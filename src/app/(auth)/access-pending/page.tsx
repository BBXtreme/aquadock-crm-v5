import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { syncPendingEmailConfirmationIfNeeded } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccessPendingPage() {
  await syncPendingEmailConfirmationIfNeeded();
  const t = await getTranslations("onboarding");
  const tLogin = await getTranslations("login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>{t("accessPendingTitle")}</CardTitle>
          <CardDescription>{t("accessPendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="outline">
            <Link href="/login">{tLogin("signInTitle")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
