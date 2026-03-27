"use client";
import { Edit, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/supabase/database.types";

interface Props {
  company: Company;
  onEdit?: () => void;
}

export default function AdresseCard({ company, onEdit }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Adresse
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Strasse</div>
            <p className="text-sm text-gray-900">{company.strasse || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">PLZ</div>
            <p className="text-sm text-gray-900">{company.plz || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Stadt</div>
            <p className="text-sm text-gray-900">{company.stadt || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Bundesland</div>
            <p className="text-sm text-gray-900">{company.bundesland || "—"}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Land</div>
            <p className="text-sm text-gray-900">{company.land || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
