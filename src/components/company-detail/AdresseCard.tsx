"use client";
import { Edit, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "@/lib/supabase/database.types";
import AdresseEditForm from "@/components/features/AdresseEditForm";

interface Props {
  company: Company;
  onEdit?: () => void;
}

export default function AdresseCard({ company, onEdit }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresse
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Adresse</DialogTitle>
          </DialogHeader>
          <AdresseEditForm
            company={company}
            onSuccess={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
