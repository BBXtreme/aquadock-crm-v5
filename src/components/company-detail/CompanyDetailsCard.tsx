// src/components/company-detail/CompanyDetailsCard.tsx
"use client";
import { Building, Edit, } from "lucide-react";
import { useState } from "react";
import AdresseEditForm from "@/components/features/companies/AdresseEditForm";
import FirmendatenEditForm from "@/components/features/companies/FirmendatenEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/use-translations";
import { getCountryFlag } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import type { Company } from "@/types/database.types";

interface Props {
  company: Company;
  onCompanyUpdated?: () => void;
}

export default function CompanyDetailsCard({ company, onCompanyUpdated }: Props) {
  const t = useT("companies");
  const tCommon = useT("common");
  const [firmendatenEditOpen, setFirmendatenEditOpen] = useState(false);
  const [adresseEditOpen, setAdresseEditOpen] = useState(false);

  const formatWebsite = (website: string | null) => {
    if (!website) return safeDisplay(website);
    const url = website.startsWith("http") ? website : `https://${website}`;
    const display = website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={website}
        className="block truncate text-primary underline-offset-4 hover:underline"
      >
        {display}
      </a>
    );
  };

  const formatTelefon = (telefon: string | null) => {
    if (!telefon) return safeDisplay(telefon);
    return (
      <a href={`tel:${telefon}`} className="block truncate text-primary underline-offset-4 hover:underline" title={telefon}>
        {telefon}
      </a>
    );
  };

  const formatEmail = (email: string | null) => {
    if (!email) return safeDisplay(email);
    return (
      <a href={`mailto:${email}`} className="block truncate text-primary underline-offset-4 hover:underline" title={email}>
        {email}
      </a>
    );
  };

  const countryFlag = getCountryFlag(company.land);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" /> {t("detailSectionFirmendaten")}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFirmendatenEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 [&>div]:min-w-0">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelFirmenname")}</div>
              <p className="text-sm text-foreground">{safeDisplay(company.firmenname)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelRechtsform")}</div>
              <p className="text-sm text-foreground">{safeDisplay(company.rechtsform)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelKundentyp")}</div>
              <p className="text-sm text-foreground">
                {company.kundentyp
                  ? company.kundentyp.charAt(0).toUpperCase() + company.kundentyp.slice(1)
                  : safeDisplay(company.kundentyp)}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelFirmentyp")}</div>
              <p className="text-sm text-foreground">{safeDisplay(company.firmentyp)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelWebsite")}</div>
              <p className="text-sm text-foreground">{formatWebsite(company.website)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelTelefon")}</div>
              <p className="text-sm text-foreground">{formatTelefon(company.telefon)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelEmail")}</div>
              <p className="text-sm text-foreground">{formatEmail(company.email)}</p>
            </div>
          </div>
          <hr className="my-4" />
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" /> {t("detailSectionAdresse")}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdresseEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" /> 
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 [&>div]:min-w-0">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelStrasse")}</div>
              <p className="text-sm text-foreground">{company.strasse || tCommon("dash")}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelPlzStadt")}</div>
              <p className="text-sm text-foreground">
                {company.plz ? `${company.plz} ` : ""}
                {company.stadt || tCommon("dash")}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelBundesland")}</div>
              <p className="text-sm text-foreground">{company.bundesland || tCommon("dash")}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelLand")}</div>
              <p className="text-sm text-foreground flex items-center gap-2">
                {countryFlag && <span className="text-xl">{countryFlag}</span>}
                {company.land || tCommon("dash")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={firmendatenEditOpen} onOpenChange={setFirmendatenEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dialogEditFirmendatenTitle")}</DialogTitle>
          </DialogHeader>
          <FirmendatenEditForm
            company={company}
            onSuccess={() => {
              onCompanyUpdated?.();
              setFirmendatenEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={adresseEditOpen} onOpenChange={setAdresseEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dialogEditAddressTitle")}</DialogTitle>
          </DialogHeader>
          <AdresseEditForm
            company={company}
            onSuccess={() => {
              onCompanyUpdated?.();
              setAdresseEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
