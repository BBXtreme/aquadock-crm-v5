"use client";
import { Building, Edit } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "@/lib/supabase/database.types";

interface Props {
  company: Company;
}

export default function FirmendatenCard({ company }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Firmendaten</DialogTitle>
          </DialogHeader>
          <p>Edit form not implemented yet.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
