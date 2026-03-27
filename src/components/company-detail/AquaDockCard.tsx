"use client";

import { Edit, MapPin, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AquaDockEditForm from "@/components/features/AquaDockEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface Props {
  company: Company;
}

export default function AquaDockCard({ company }: Props) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatOsmLink = () => {
    if (!company.osm) return "—";

    const zoom = 16;
    const lat = company.lat ?? 50.0;
    const lon = company.lon ?? 9.0;
    const url = `https://www.openstreetmap.org/${company.osm}#map=${zoom}/${lat}/${lon}`;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline font-medium break-all"
      >
        <MapPin className="w-4 h-4" />
        <span className="font-mono text-sm">{company.osm}</span>
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
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
              <p className="text-sm text-gray-900">{company.lat ?? "—"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Longitude</div>
              <p className="text-sm text-gray-900">{company.lon ?? "—"}</p>
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">OSM ID</div>
                  <p className="text-sm text-gray-900">{formatOsmLink()}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (company.lat && company.lon) {
                      router.push(`/openmap?lat=${company.lat}&lon=${company.lon}&zoom=13`);
                    } else {
                      router.push('/openmap');
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Show in OpenMap
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AquaDock Daten bearbeiten</DialogTitle>
          </DialogHeader>
          <AquaDockEditForm company={company} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
