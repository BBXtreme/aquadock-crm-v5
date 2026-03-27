"use client";
import { BarChart, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/supabase/database.types";
import CRMForm from "./CRMForm";

interface Props {
  company: Company;
  onEdit?: () => void;
}

export default function CrmCard({ company, onEdit }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            CRM Informationen
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
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
