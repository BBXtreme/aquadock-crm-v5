"use client";
import { ArrowLeft, Edit, Plus, Trash, Waves } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { getKundentypLabel } from "./utils";

interface Props {
  company: Company;
  id: string;
  router: any;
}

export default function CompanyHeader({ company, id, router }: Props) {
  return (
    <>
      <nav className="text-sm text-gray-600">
        <Link href="/companies" className="hover:underline">
          Companies
        </Link>{" "}
        &gt; {company.firmenname}
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{company.firmenname}</h1>
          {company.rechtsform && <p className="text-gray-600 mt-1">{company.rechtsform}</p>}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              /* timeline dialog is handled in TimelineCard */
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Timeline
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this company?")) {
                /* deleteCompany(id); router.push("/companies"); */
              }
            }}
          >
            <Trash className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push("/companies")} size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge
          className={cn(
            company.status === "gewonnen" && "bg-emerald-600 text-white",
            company.status === "verloren" && "bg-rose-600 text-white",
            company.status === "lead" && "bg-amber-600 text-white",
          )}
        >
          {company.status}
        </Badge>
        {company.kundentyp && <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && (
          <Badge variant="outline">{company.firmentyp === "kette" ? "Kette" : "Einzelbetrieb"}</Badge>
        )}
        {company.wassertyp && (
          <Badge variant="outline">
            <Waves className="w-3 h-3 mr-1" /> {company.wassertyp}
          </Badge>
        )}
        {company.created_at && (
          <span className="text-sm text-gray-500">Created: {new Date(company.created_at).toLocaleDateString()}</span>
        )}
        {company.updated_at && (
          <span className="text-sm text-gray-500">Updated: {new Date(company.updated_at).toLocaleDateString()}</span>
        )}
      </div>
    </>
  );
}
