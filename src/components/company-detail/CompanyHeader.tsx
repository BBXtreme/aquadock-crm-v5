// This component renders the header section of the company detail page, including the company name, status badges, and action buttons for editing and adding timeline entries. It also handles the logic for opening dialogs and submitting forms related to the company.  - source:
"use client";
import { ArrowLeft, Edit, Plus, Sparkles, Trash, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteCompany } from "@/lib/actions/companies";
import { restoreCompanyWithTrash } from "@/lib/actions/crm-trash";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/database.types";
import { getCountryFlag, getFirmentypLabel, getKundentypLabel, getStatusLabel } from "../../lib/utils";

interface Props {
  company: Company;
  id: string;
  router: { push: (href: string) => void };
  onAddTimeline: () => void;
  onEdit: () => void;
  onAiEnrich?: () => void;
}

export default function CompanyHeader({ company, id, router, onAddTimeline, onEdit, onAiEnrich }: Props) {
  const t = useT("companies");
  const tCommon = useT("common");
  const localeTag = useNumberLocaleTag();
  const countryFlag = getCountryFlag(company.land);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl+E");

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setShortcutLabel("⌘E");
    }
  }, []);

  return (
    <>
      <nav className="text-sm text-muted-foreground">
        <Link href="/companies" className="hover:underline">
          {t("title")}
        </Link>{" "}
        &gt; {company.firmenname}
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{company.firmenname}</h1>
          {company.rechtsform && <p className="text-muted-foreground mt-1">{company.rechtsform}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" type="button" onClick={onAddTimeline}>
            <Plus className="h-4 w-4 mr-2" /> {t("headerAddTimeline")}
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          {onAiEnrich ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onAiEnrich}
              title={t("aiEnrich.buttonTitleWithShortcut", { shortcut: shortcutLabel })}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              <span className="inline-flex items-center gap-2">
                {t("aiEnrich.button")}
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
                  {shortcutLabel}
                </kbd>
              </span>
            </Button>
          ) : null}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" type="button">
                <Trash className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("tableDeleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("tableDeleteConfirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const mode = await deleteCompany(id);
                    setDeleteDialogOpen(false);
                    if (mode === "soft") {
                      toast.success(t("toastDeleted"), {
                        action: {
                          label: "Rückgängig",
                          onClick: () => {
                            void restoreCompanyWithTrash(id).then(() => {
                              toast.success(t("toastUpdated"));
                            });
                          },
                        },
                      });
                    } else {
                      toast.success(t("toastDeleted"));
                    }
                    router.push("/companies");
                  }}
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => router.push("/companies")} size="sm" type="button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge
          className={cn(
            company.status === "gewonnen" && "bg-emerald-600 text-white",
            company.status === "verloren" && "bg-rose-600 text-white",
            company.status === "lead" && "bg-amber-600 text-white",
          )}
        >
          {getStatusLabel(company.status)}
        </Badge>
        {company.kundentyp && <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && <Badge variant="outline">{getFirmentypLabel(company.firmentyp)}</Badge>}
        {company.wassertyp && (
          <Badge variant="outline">
            <Waves className="w-3 h-3 mr-1" /> {company.wassertyp}
          </Badge>
        )}
        {countryFlag && (
          <Badge variant="outline" className="text-lg">
            {countryFlag}
          </Badge>
        )}
        {company.created_at && (
          <span className="text-sm text-muted-foreground">
            {tCommon("metaCreated")} {new Date(company.created_at).toLocaleDateString(localeTag)}
          </span>
        )}
        {company.updated_at && (
          <span className="text-sm text-muted-foreground">
            {tCommon("metaUpdated")} {new Date(company.updated_at).toLocaleDateString(localeTag)}
          </span>
        )}
      </div>
    </>
  );
}
