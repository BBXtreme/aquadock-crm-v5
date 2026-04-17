"use client";

import { Edit, MapPin, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AquaDockEditForm from "@/components/features/companies/AquaDockEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyDash } from "@/components/ui/empty-dash";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface Props {
  company: Company;
  onCompanyUpdated?: () => void;
}

export default function AquaDockCard({ company, onCompanyUpdated }: Props) {
  const t = useT("companies");
  const localeTag = useNumberLocaleTag();
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatOsmLink = () => {
    if (!company.osm) return <EmptyDash />;

    const zoom = 16;
    const lat = company.lat ?? 50.0;
    const lon = company.lon ?? 9.0;
    const url = `https://www.openstreetmap.org/${company.osm}#map=${zoom}/${lat}/${lon}`;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline font-medium break-all"
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
              {t("detailSectionAquadock")}
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelWasserdistanz")}</div>
              <p className="text-sm text-foreground">
                {company.wasserdistanz != null
                  ? t("detailMeters", { meters: company.wasserdistanz })
                  : <EmptyDash />}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelWassertyp")}</div>
              <p className="text-sm text-foreground">{company.wassertyp || <EmptyDash />}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelLatitude")}</div>
              <p className="text-sm text-foreground">
                {company.lat != null ? company.lat.toLocaleString(localeTag) : <EmptyDash />}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelLongitude")}</div>
              <p className="text-sm text-foreground">
                {company.lon != null ? company.lon.toLocaleString(localeTag) : <EmptyDash />}
              </p>
            </div>
            <div className="lg:col-span-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("detailLabelOsmId")}</div>
                <p className="text-sm text-foreground">{formatOsmLink()}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (company.lat && company.lon) {
                      router.push(`/openmap?lat=${company.lat}&lon=${company.lon}&zoom=13`);
                    } else {
                      router.push("/openmap");
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {t("detailOpenMapButton")}
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
            <DialogTitle>{t("dialogEditAquadockTitle")}</DialogTitle>
          </DialogHeader>
          <AquaDockEditForm
            company={company}
            onSuccess={() => {
              onCompanyUpdated?.();
              setEditDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
