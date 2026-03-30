// src/components/company-detail/FirmendatenCard.tsx
// This component displays the company data in a card format. It shows fields like company name, legal form, customer type, company type, website, phone, and email. It also includes an edit button that opens a dialog with a form to edit the company data.

"use client";
import { Building, Edit } from "lucide-react";
import { useState } from "react";
import FirmendatenEditForm from "@/components/features/companies/FirmendatenEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "@/lib/supabase/database.types";
import { safeDisplay } from "@/lib/utils/data-format";

interface Props {
  company: Company;
}

export default function FirmendatenCard({ company }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" /> Firmendaten
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
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
        </CardContent>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Firmendaten</DialogTitle>
          </DialogHeader>
          <FirmendatenEditForm company={company} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
