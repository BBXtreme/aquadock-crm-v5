"use client";
import { BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/supabase/database.types";
import CRMForm from "./CRMForm";

interface Props {
  company: Company;
}

export default function CrmCard({ company }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            CRM Informationen
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
