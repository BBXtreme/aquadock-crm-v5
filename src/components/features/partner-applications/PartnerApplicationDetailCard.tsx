"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updatePartnerApplicationStatus } from "@/lib/actions/partner-applications-admin";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import {
  PARTNER_APPLICATION_STATUSES,
  type PartnerApplicationIndustry,
  type PartnerApplicationStatus,
} from "@/lib/validations/partner-application";
import type { PartnerApplication } from "@/types/database.types";

type Props = {
  application: PartnerApplication;
  cvDownloadUrl: string | null;
};

function formatSubmittedAt(iso: string, localeTag: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

function formatIndustries(
  industries: string[],
  t: (key: `industry.${PartnerApplicationIndustry}`) => string,
): string {
  return industries
    .map((value) => {
      const key = `industry.${value}` as `industry.${PartnerApplicationIndustry}`;
      return t(key);
    })
    .join(", ");
}

export function PartnerApplicationDetailCard({ application, cvDownloadUrl }: Props) {
  const t = useT("partnerApplications");
  const localeTag = useNumberLocaleTag();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PartnerApplicationStatus>(
    application.status as PartnerApplicationStatus,
  );
  const [adminNotes, setAdminNotes] = useState(application.admin_notes ?? "");

  const mutation = useMutation({
    mutationFn: updatePartnerApplicationStatus,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin-partner-applications"] });
      router.refresh();
    },
  });

  const industries = application.industry_experience ?? [];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/partner-applications" className="text-primary text-sm hover:underline">
          ← {t("backToList")}
        </Link>
        <h2 className="mt-4 font-bold text-2xl">
          {application.first_name} {application.last_name}
        </h2>
        <p className="text-muted-foreground">{application.email}</p>
        <p className="text-muted-foreground text-sm">
          {t("fieldSubmitted")}: {formatSubmittedAt(application.created_at, localeTag)}
          {application.locale ? ` · ${t("fieldLocale")}: ${application.locale.toUpperCase()}` : null}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldPhone")}</dt>
          <dd>{application.phone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldCompany")}</dt>
          <dd>{application.company_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldLocation")}</dt>
          <dd>
            {application.city_region}, {application.country_code}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldTerritory")}</dt>
          <dd>{application.proposed_territory}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldExperience")}</dt>
          <dd>
            {application.years_sales_experience} {t("yearsSuffix")}
            {industries.length > 0
              ? ` · ${formatIndustries(industries, (key) => t(key))}`
              : null}
          </dd>
        </div>
        {application.tax_id ? (
          <div>
            <dt className="text-muted-foreground text-sm">{t("fieldTaxId")}</dt>
            <dd>{application.tax_id}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldHandelsvertreter")}</dt>
          <dd>{application.handelsvertreter_ack ? t("yes") : t("no")}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground text-sm">{t("fieldMotivation")}</dt>
          <dd className="whitespace-pre-wrap">{application.motivation}</dd>
        </div>
        {application.linkedin_url ? (
          <div>
            <dt className="text-muted-foreground text-sm">LinkedIn</dt>
            <dd>
              <a
                href={application.linkedin_url}
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {application.linkedin_url}
              </a>
            </dd>
          </div>
        ) : null}
        {application.references_text ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">{t("fieldReferences")}</dt>
            <dd className="whitespace-pre-wrap">{application.references_text}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground text-sm">{t("fieldCv")}</dt>
          <dd>
            {cvDownloadUrl ? (
              <a
                href={cvDownloadUrl}
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {t("downloadCv")}
              </a>
            ) : (
              <span className="text-muted-foreground">{t("noCv")}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="pa-status">{t("fieldStatus")}</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as PartnerApplicationStatus)}
          >
            <SelectTrigger id="pa-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTNER_APPLICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as "status.new")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pa-notes">{t("fieldAdminNotes")}</Label>
          <Textarea
            id="pa-notes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
          />
        </div>
        <Button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({ id: application.id, status, adminNotes })
          }
        >
          {mutation.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
