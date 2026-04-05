// src/components/company-detail/CompanyDetailsCard.tsx
"use client";
import { Building, Edit, } from "lucide-react";
import { useState } from "react";
import AdresseEditForm from "@/components/features/companies/AdresseEditForm";
import FirmendatenEditForm from "@/components/features/companies/FirmendatenEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCountryFlag } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import type { Company } from "@/types/database.types";

interface Props {
  company: Company;
}

export default function CompanyDetailsCard({ company }: Props) {
  const [firmendatenEditOpen, setFirmendatenEditOpen] = useState(false);
  const [adresseEditOpen, setAdresseEditOpen] = useState(false);

  const formatWebsite = (website: string | null) => {
    if (!website) return safeDisplay(website);
    const url = website.startsWith("http") ? website : `https://${website}`;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {website}
      </a>
    );
  };

  const formatTelefon = (telefon: string | null) => {
    if (!telefon) return safeDisplay(telefon);
    return (
      <a href={`tel:${telefon}`} className="text-blue-600 hover:underline">
        {telefon}
      </a>
    );
  };

  const formatEmail = (email: string | null) => {
    if (!email) return safeDisplay(email);
    return (
      <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
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
              <Building className="w-5 h-5" /> Firmendaten
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFirmendatenEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Firmenname</div>
              <p className="text-sm text-gray-900">{safeDisplay(company.firmenname)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Rechtsform</div>
              <p className="text-sm text-gray-900">{safeDisplay(company.rechtsform)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Kundentyp</div>
              <p className="text-sm text-gray-900">
                {company.kundentyp
                  ? company.kundentyp.charAt(0).toUpperCase() + company.kundentyp.slice(1)
                  : safeDisplay(company.kundentyp)}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Firmentyp</div>
              <p className="text-sm text-gray-900">{safeDisplay(company.firmentyp)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Website</div>
              <p className="text-sm text-gray-900">{formatWebsite(company.website)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Telefon</div>
              <p className="text-sm text-gray-900">{formatTelefon(company.telefon)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Email</div>
              <p className="text-sm text-gray-900">{formatEmail(company.email)}</p>
            </div>
          </div>
          <hr className="my-4" />
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" /> Adresse
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdresseEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" /> 
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Straße</div>
              <p className="text-sm text-gray-900">{company.strasse || "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">PLZ / Stadt</div>
              <p className="text-sm text-gray-900">
                {company.plz ? `${company.plz} ` : ""}
                {company.stadt || "—"}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Bundesland</div>
              <p className="text-sm text-gray-900">{company.bundesland || "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Land</div>
              <p className="text-sm text-gray-900 flex items-center gap-2">
                {countryFlag && <span className="text-xl">{countryFlag}</span>}
                {company.land || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={firmendatenEditOpen} onOpenChange={setFirmendatenEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Firmendaten</DialogTitle>
          </DialogHeader>
          <FirmendatenEditForm company={company} onSuccess={() => setFirmendatenEditOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={adresseEditOpen} onOpenChange={setAdresseEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adresse bearbeiten</DialogTitle>
          </DialogHeader>
          <AdresseEditForm company={company} onSuccess={() => setAdresseEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
