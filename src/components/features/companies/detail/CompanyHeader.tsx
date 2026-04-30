// This component renders the header section of the company detail page, including the company name, status badges, and action buttons for editing and adding timeline entries. It also handles the logic for opening dialogs and submitting forms related to the company.  - source:
"use client";
import { ArrowLeft, ChevronLeft, ChevronRight, Edit, Plus, Sparkles, Trash } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { WassertypBadge } from "@/components/ui/wassertyp-badge";
import { deleteCompany } from "@/lib/actions/companies";
import { restoreCompanyWithTrash } from "@/lib/actions/crm-trash";
import { getLandRegionDisplayName } from "@/lib/countries/iso-land";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { getCountryFlag, getFirmentypLabel, getKundentypLabel } from "@/lib/utils";
import type { Company } from "@/types/database.types";

interface Props {
  company: Company;
  id: string;
  router: { push: (href: string) => void };
  /** Serialized `/companies` list query (no `?`), preserved on detail links */
  companiesListSearchParams?: string;
  hasListNavContext?: boolean;
  prevCompanyId?: string | null;
  nextCompanyId?: string | null;
  listNavIdsLoading?: boolean;
  /** Pre-rendered responsible-person line from RSC (i18n + safeDisplay) */
  ownerDisplayLine?: string | null;
  onAddTimeline: () => void;
  onEdit: () => void;
  onAiEnrich?: () => void;
}

export default function CompanyHeader({
  company,
  id,
  router,
  companiesListSearchParams = "",
  hasListNavContext = false,
  prevCompanyId = null,
  nextCompanyId = null,
  listNavIdsLoading = false,
  ownerDisplayLine = null,
  onAddTimeline,
  onEdit,
  onAiEnrich,
}: Props) {
  const t = useT("companies");
  const tCommon = useT("common");
  const localeTag = useNumberLocaleTag();
  const routingLocale = useLocale();
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

  const listSuffix = companiesListSearchParams.length > 0 ? `?${companiesListSearchParams}` : "";
  const companiesIndexHref = `/companies${listSuffix}`;
  const pushCompany = (targetId: string) => {
    router.push(`/companies/${targetId}${listSuffix}`);
  };

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={companiesIndexHref}>{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[60ch] truncate">{company.firmenname}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{company.firmenname}</h1>
            {company.rechtsform && <p className="mt-1 text-muted-foreground">{company.rechtsform}</p>}
            {ownerDisplayLine != null && ownerDisplayLine !== "" && (
              <p className="mt-1 text-sm text-muted-foreground">{ownerDisplayLine}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onAddTimeline}>
            <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            {t("headerAddTimeline")}
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          {onAiEnrich ? (
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              onClick={onAiEnrich}
              aria-label={t("aiEnrich.buttonTitleWithShortcut", { shortcut: shortcutLabel })}
              title={t("aiEnrich.buttonTitleWithShortcut", { shortcut: shortcutLabel })}
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
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
                    router.push(companiesIndexHref);
                  }}
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {hasListNavContext ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listNavIdsLoading || !prevCompanyId}
                aria-label={t("detailNavPreviousAria")}
                title={t("detailNavPreviousAria")}
                onClick={() => {
                  if (prevCompanyId) {
                    pushCompany(prevCompanyId);
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listNavIdsLoading || !nextCompanyId}
                aria-label={t("detailNavNextAria")}
                title={t("detailNavNextAria")}
                onClick={() => {
                  if (nextCompanyId) {
                    pushCompany(nextCompanyId);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </>
          ) : null}
          <Button onClick={() => router.push(companiesIndexHref)} size="sm" type="button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge status={company.status} showEmoji />
        {company.kundentyp && <Badge className="bg-primary text-primary-foreground">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && <Badge variant="outline">{getFirmentypLabel(company.firmentyp)}</Badge>}
        <WassertypBadge wassertyp={company.wassertyp} />
        {company.land ? (
          <Badge variant="outline" className="gap-1.5 text-sm font-normal">
            {countryFlag ? <span className="text-lg leading-none">{countryFlag}</span> : null}
            <span>{getLandRegionDisplayName(company.land, routingLocale)}</span>
          </Badge>
        ) : null}
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
