"use client";
import { ArrowLeft, Edit, Plus, Trash, Waves } from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyEditForm from "@/components/features/CompanyEditForm";
import TimelineEntryForm from "@/components/features/TimelineEntryForm";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { getKundentypLabel, getStatusLabel, getFirmentypLabel } from "./utils";

interface Props {
  company: Company;
  id: string;
  router: { push: (href: string) => void };
}

export default function CompanyHeader({ company, id, router }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addTimelineDialogOpen, setAddTimelineDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname");
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("contacts").select("id, vorname, nachname, position, email, telefon");
      if (error) throw error;
      return data;
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (data: any) => {
      const supabase = createClient();
      const { error } = await supabase.from("timeline").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", id] });
      setAddTimelineDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error creating timeline entry:", error);
    },
  });

  const handleAddTimeline = () => {
    setAddTimelineDialogOpen(true);
  };

  const handleTimelineSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await createTimelineMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onClick={handleAddTimeline}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Timeline
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
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
          {getStatusLabel(company.status)}
        </Badge>
        {company.kundentyp && <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && (
          <Badge variant="outline">{getFirmentypLabel(company.firmentyp)}</Badge>
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={company}
            onSuccess={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={addTimelineDialogOpen} onOpenChange={setAddTimelineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Timeline Entry</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={handleTimelineSubmit}
            isSubmitting={isSubmitting}
            companies={companies}
            contacts={contacts}
            preselectedCompanyId={id}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
