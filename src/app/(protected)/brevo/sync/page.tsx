// src/app/(protected)/brevo/sync/page.tsx
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BrevoContactSyncForm from "@/components/features/brevo/BrevoContactSyncForm";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";

export default async function BrevoSyncPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
            <Link href="/brevo">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück zu Kampagnen
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Kontakte mit Brevo abgleichen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Massen-Sync ins Brevo-Adressbuch (optional nach Kundentyp / Status filtern).
          </p>
          <div className="mt-8">
            <BrevoContactSyncForm />
          </div>
        </div>
      </div>
    </div>
  );
}
