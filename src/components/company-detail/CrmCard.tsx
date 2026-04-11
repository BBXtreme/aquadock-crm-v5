"use client";
import { BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";
import type { Company } from "@/types/database.types";
import CRMForm from "./CRMForm";

interface Props {
  company: Company;
}

export default function CrmCard({ company }: Props) {
  const t = useT("companies");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            {t("detailSectionCrm")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CRMForm
          company={company}
          onSuccess={() => {
            /* parent invalidation handled in page.tsx */
          }}
        />
      </CardContent>
    </Card>
  );
}
