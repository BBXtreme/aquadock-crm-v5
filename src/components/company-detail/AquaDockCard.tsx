"use client";
import { Edit, Waves } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "@/lib/supabase/database.types";
import AquaDockEditForm from "@/components/features/AquaDockEditForm";

interface Props {
  company: Company;
  onEdit?: () => void;
}

export default function AquaDockCard({ company, onEdit }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatOsm = (osm: string | null) => {
    if (!osm) return "—";
    return (
      <a
        href={`https://www.openstreetmap.org/node/${osm}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {osm}
      </a>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5" />
              AquaDock Daten
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Wasserdistanz</div>
              <p className="text-sm text-gray-900">{company.wasserdistanz ? `${company.wasserdistanz} m` : "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Wassertyp</div>
              <p className="text-sm text-gray-900">{company.wassertyp || "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Latitude</div>
              <p className="text-sm text-gray-900">{company.lat || "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Longitude</div>
              <p className="text-sm text-gray-900">{company.lon || "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">OSM</div>
              <p className="text-sm text-gray-900">{formatOsm(company.osm)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AquaDock Daten</DialogTitle>
          </DialogHeader>
          <AquaDockEditForm
            company={company}
            onSuccess={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
