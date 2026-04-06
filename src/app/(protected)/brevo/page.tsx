// src/app/(protected)/brevo/page.tsx
import { Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientBrevoPage from "./ClientBrevoPage";

function BrevoPageSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default async function BrevoPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-6 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">Marketing → Brevo</p>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Brevo-Kampagnen
            </h1>
            <p className="max-w-2xl text-muted-foreground leading-relaxed">
              E-Mail-Kampagnen erstellen und an Brevo übergeben. Kontakte massenweise abgleichen finden Sie unter{" "}
              <span className="font-medium text-foreground">Kontakte abgleichen</span>.
            </p>
          </div>
          <Button variant="outline" size="default" className="h-10 shrink-0 gap-2 self-stretch sm:self-start" asChild>
            <Link href="/brevo/sync">
              <Users className="h-4 w-4" aria-hidden />
              Kontakte abgleichen
            </Link>
          </Button>
        </header>

        <Suspense fallback={<BrevoPageSkeleton />}>
          <ClientBrevoPage />
        </Suspense>
      </div>
    </div>
  );
}
