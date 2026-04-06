// src/app/(protected)/brevo/sync/page.tsx
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BrevoContactSyncForm from "@/components/features/brevo/BrevoContactSyncForm";
import BrevoContactSyncView from "@/components/features/brevo/BrevoContactSyncView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";

export default async function BrevoSyncPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-9 w-fit gap-2 px-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/brevo">
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Zurück zu Kampagnen
            </Link>
          </Button>

          <header className="border-b pb-6">
            <p className="text-sm text-muted-foreground">Brevo → Kontakte</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Kontakte mit Brevo abgleichen
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">
              Kontakte auswählen, nach Kundentyp und Status filtern und gezielt in Brevo-Listen importieren — oder die
              Massen-Synchronisation für den gesamten gefilterten Bestand nutzen.
            </p>
          </header>
        </div>

        <BrevoContactSyncView />

        <section aria-labelledby="brevo-mass-sync-heading">
          <Card className="border-border rounded-xl shadow-sm">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle id="brevo-mass-sync-heading" className="text-xl font-semibold tracking-tight">
                Massen-Synchronisation
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed">
                Alle CRM-Kontakte, die den Filtern in der Massen-Synchronisation entsprechen, in einem Schritt an Brevo
                übermitteln — ohne vorherige Auswahl in der Tabelle.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <BrevoContactSyncForm />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
