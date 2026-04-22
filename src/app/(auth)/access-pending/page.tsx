import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { syncPendingEmailConfirmationIfNeeded } from "@/lib/actions/onboarding";
import { getMessagesForLocale, resolveAppLocale } from "@/lib/i18n/messages";

export default async function AccessPendingPage() {
  await syncPendingEmailConfirmationIfNeeded();
  const messages = getMessagesForLocale(resolveAppLocale(undefined));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>{messages.onboarding.accessPendingTitle}</CardTitle>
          <CardDescription>{messages.onboarding.accessPendingDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="outline">
            <Link href="/login">{messages.login.signInTitle}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
