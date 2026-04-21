import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import ClientNotificationsPage from "./ClientNotificationsPage";

export default async function NotificationsPage() {
  await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<LoadingState count={8} />}>
        <ClientNotificationsPage />
      </Suspense>
    </PageShell>
  );
}
