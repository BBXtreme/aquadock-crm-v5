// src/app/(protected)/brevo/page.tsx
import { Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import ClientBrevoPage from "./ClientBrevoPage";

export default async function BrevoPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Brevo</h1>
            <p className="text-muted-foreground">
              Kampagnen und Empfängerauswahl. Kontakte massenhaft zu Brevo übernehmen:{" "}
              <span className="font-medium text-foreground">Kontakte abgleichen</span> (oben rechts).
            </p>
          </div>
          <Button variant="outline" size="default" className="shrink-0 gap-2 self-start" asChild>
            <Link href="/brevo/sync">
              <Users className="h-4 w-4" aria-hidden />
              Kontakte abgleichen
            </Link>
          </Button>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ClientBrevoPage />
        </Suspense>
      </div>
    </div>
  );
}
