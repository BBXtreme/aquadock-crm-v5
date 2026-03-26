"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building, Calendar, Edit, Plus, Trash, User, Waves } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import CompanyEditForm from "@/components/features/CompanyEditForm";
import ContactCreateForm from "@/components/features/ContactCreateForm";
import ContactEditForm from "@/components/features/ContactEditForm";
import ReminderCreateForm from "@/components/features/ReminderCreateForm";
import ReminderEditForm from "@/components/features/ReminderEditForm";
import TimelineEntryForm from "@/components/features/TimelineEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Company, Contact, Database, TimelineEntry } from "@/lib/supabase/database.types";
import { deleteCompany, getCompanyById } from "@/lib/supabase/services/companies";

type TimelineEntryWithJoins = TimelineEntry & {
  companies?: Pick<Company, "firmenname"> | null;
  contacts?: Pick<Contact, "vorname" | "nachname" | "position"> | null;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [edit, setEdit] = useState(false);
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [addReminderDialog, setAddReminderDialog] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);
  const [editContact, setEditContact] = useState<Database["public"]["Tables"]["contacts"]["Row"] | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Database["public"]["Tables"]["reminders"]["Row"] | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const supabase = createClient();
      return getCompanyById(id, supabase);
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("contacts").select("*").eq("company_id", id);
      return data || [];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("reminders").select("*").eq("company_id", id);
      return data || [];
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["timeline", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("timeline")
        .select("*, companies!company_id(firmenname), contacts!contact_id(vorname, nachname)")
        .eq("company_id", id);
      return data || [];
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          company_id: preselectedCompanyId || values.company_id || company?.id,
          user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", id] });
      toast.success("Timeline entry created");
      setTimelineDialogOpen(false);
    },
  });

  if (isLoading) return <div className="container mx-auto p-6">Loading company details...</div>;
  if (error || !company) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Company Not Found</h1>
        <Button onClick={() => router.push("/companies")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Companies → {company.firmenname}</div>
          <h1 className="text-3xl font-bold tracking-tight">{company.firmenname}</h1>
          {company.rechtsform && <p className="text-gray-600 mt-1">{company.rechtsform}</p>}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setEdit(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Company
          </Button>
          <Button
            onClick={() => {
              if (confirm("Delete this company?")) {
                deleteCompany(company.id);
                router.push("/companies");
              }
            }}
            variant="destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={() => router.push("/companies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex gap-3">
        <Badge>{company.status || "—"}</Badge>
        {company.kundentyp && <Badge variant="secondary">{company.kundentyp}</Badge>}
        {company.firmentyp && <Badge variant="outline">{company.firmentyp}</Badge>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Open Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reminders.filter((r) => r.status === "open").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{timeline.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Firmendaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>Firmenname:</strong> {company.firmenname}
            </p>
            <p>
              <strong>Rechtsform:</strong> {company.rechtsform || "—"}
            </p>
            <p>
              <strong>Kundentyp:</strong> {company.kundentyp || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5" />
              AquaDock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>Wasserdistanz:</strong> {company.wasserdistanz ? `${company.wasserdistanz} m` : "—"}
            </p>
            <p>
              <strong>Wassertyp:</strong> {company.wassertyp || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setAddContactDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
        <Button onClick={() => setAddReminderDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Reminder
        </Button>
        <Button onClick={() => setTimelineDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Timeline
        </Button>
      </div>

      {/* Timeline Dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Timeline Entry for {company.firmenname}</DialogTitle>
            <DialogDescription>Add a new activity.</DialogDescription>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={async (values) => await createTimelineMutation.mutateAsync(values)}
            isSubmitting={createTimelineMutation.isPending}
            companies={[]}
            contacts={[]}
            editEntry={editEntry}
            preselectedCompanyId={company.id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
