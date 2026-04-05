// This component renders the header section of the company detail page, including the company name, status badges, and action buttons for editing and adding timeline entries. It also handles the logic for opening dialogs and submitting forms related to the company.  - source:
"use client";
import { ArrowLeft, Edit, Plus, Trash, Waves } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteCompany } from "@/lib/actions/companies";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/database.types";
import { getCountryFlag, getFirmentypLabel, getKundentypLabel, getStatusLabel } from "../../lib/utils";

interface Props {
  company: Company;
  id: string;
  router: { push: (href: string) => void };
  onAddTimeline: () => void;
  onEdit: () => void;
}

export default function CompanyHeader({ company, id, router, onAddTimeline, onEdit }: Props) {
  const countryFlag = getCountryFlag(company.land);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
          <Button variant="outline" size="sm" type="button" onClick={onAddTimeline}>
            <Plus className="h-4 w-4 mr-2" /> Add Timeline
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" type="button">
                <Trash className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this company? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteCompany(id);
                    router.push("/companies");
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => router.push("/companies")} size="sm" type="button">
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
          {getStatusLabel(company.status)}
        </Badge>
        {company.kundentyp && <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && <Badge variant="outline">{getFirmentypLabel(company.firmentyp)}</Badge>}
        {company.wassertyp && (
          <Badge variant="outline">
            <Waves className="w-3 h-3 mr-1" /> {company.wassertyp}
          </Badge>
        )}
        {countryFlag && (
          <Badge variant="outline" className="text-lg">
            {countryFlag}
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
