// src/app/(protected)/companies/[id]/CompanyDetailClient.tsx
// This file defines the CompanyDetailClient component, which is responsible for rendering the detailed view of a single company.
// It receives the company data as props and renders various cards and sections related to the company's information, linked contacts, reminders, and timeline events.
// The component also handles any necessary client-side interactions and state management for the company detail view.  
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyDetailsCard from "@/components/company-detail/CompanyDetailsCard";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface CompanyDetailClientProps {
  company: Company;
}

export default function CompanyDetailClient({ company }: CompanyDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addTimelineDialogOpen, setAddTimelineDialogOpen] = useState(false);

  const handleAddTimeline = () => setAddTimelineDialogOpen(true);
  const handleEdit = () => setEditDialogOpen(true);

  return (
    <Suspense fallback={<LoadingState count={8} />}>
      <div className="container mx-auto p-6 space-y-8">
        <CompanyHeader
          company={company}
          router={router}
          onAddTimeline={handleAddTimeline}
          onEdit={handleEdit}
        />
        <CompanyKpiCards company={company} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CompanyDetailsCard company={company} />
          <AquaDockCard company={company} />
          <CrmCard company={company} />
        </div>
        <LinkedContactsCard companyId={company.id} />
        <RemindersCard companyId={company.id} />
        <TimelineCard companyId={company.id} />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={company}
            onSuccess={() => {
              setEditDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["companies"] });
              queryClient.invalidateQueries({ queryKey: ["company", company.id] });
              toast.success("Company updated");
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addTimelineDialogOpen} onOpenChange={setAddTimelineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Timeline Entry</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={async (values) => {
              // Handle timeline creation
              console.log("Timeline values:", values);
              setAddTimelineDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["timeline", company.id] });
              toast.success("Timeline entry added");
            }}
            isSubmitting={false}
            companies={[]}
            contacts={[]}
            preselectedCompanyId={company.id}
          />
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}
