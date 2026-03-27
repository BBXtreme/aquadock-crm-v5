"use client";
import { Building, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/supabase/database.types";

interface Props {
  company: Company;
}

export default function FirmendatenCard({ company }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" /> Firmendaten
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Firmenname</div>
            <p className="text-sm text-gray-900">{company.firmenname || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Rechtsform</div>
            <p className="text-sm text-gray-900">{company.rechtsform || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Kundentyp</div>
            <p className="text-sm text-gray-900">
              {company.kundentyp ? company.kundentyp.charAt(0).toUpperCase() + company.kundentyp.slice(1) : "—"}
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Firmentyp</div>
            <p className="text-sm text-gray-900">{company.firmentyp || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Website</div>
            <p className="text-sm text-gray-900">{company.website || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Telefon</div>
            <p className="text-sm text-gray-900">{company.telefon || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Email</div>
            <p className="text-sm text-gray-900">{company.email || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
