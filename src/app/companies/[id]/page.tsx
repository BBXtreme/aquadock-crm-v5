"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAfter } from "date-fns";
import { ArrowLeft, Building, Calendar, Edit, Plus, Trash, User, Waves } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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

const firmendatenSchema = z.object({
  firmenname: z.string().min(1, "Firmenname is required"),
  rechtsform: z.string().optional(),
  kundentyp: z.string().optional(),
  firmentyp: z.string().optional(),
  website: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().optional(),
});

const adresseSchema = z.object({
  strasse: z.string().optional(),
  plz: z.string().optional(),
  stadt: z.string().optional(),
  bundesland: z.string().optional(),
  land: z.string().optional(),
});

const aquaDockSchema = z.object({
  wasserdistanz: z.number().nullable(),
  wassertyp: z.string().optional(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  osm: z.string().optional(),
});

const crmSchema = z.object({
  status: z
    .enum([
      "lead",
      "interessant",
      "qualifiziert",
      "akquise",
      "angebot",
      "gewonnen",
      "verloren",
      "kunde",
      "partner",
      "inaktiv",
    ])
    .optional(),
  value: z.number().nullable(),
  notes: z.string().optional(),
});

type FirmendatenFormValues = z.infer<typeof firmendatenSchema>;
type AdresseFormValues = z.infer<typeof adresseSchema>;
type AquaDockFormValues = z.infer<typeof aquaDockSchema>;
type CRMFormValues = z.infer<typeof crmSchema>;

const _kundentypOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "camping", label: "Camping" },
  { value: "marina", label: "Marina" },
  { value: "segelschule", label: "Segelschule" },
  { value: "segelverein", label: "Segelverein" },
  { value: "bootsverleih", label: "Bootsverleih" },
  { value: "neukunde", label: "Neukunde" },
  { value: "bestandskunde", label: "Bestandskunde" },
  { value: "interessent", label: "Interessent" },
  { value: "partner", label: "Partner" },
  { value: "sonstige", label: "Sonstige" },
];

const _firmentypOptions = [
  { value: "kette", label: "Kette" },
  { value: "einzeln", label: "Einzelbetrieb" },
];

const _statusOptions = [
  { value: "lead", label: "Lead" },
  { value: "interessant", label: "Interessant" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "akquise", label: "Akquise" },
  { value: "angebot", label: "Angebot" },
  { value: "gewonnen", label: "Gewonnen" },
  { value: "verloren", label: "Verloren" },
  { value: "kunde", label: "Kunde" },
  { value: "partner", label: "Partner" },
  { value: "inaktiv", label: "Inaktiv" },
];

const _landOptions = [
  { value: "Deutschland", label: "Deutschland" },
  { value: "Österreich", label: "Österreich" },
  { value: "Schweiz", label: "Schweiz" },
  { value: "Frankreich", label: "Frankreich" },
  { value: "Italien", label: "Italien" },
  { value: "Spanien", label: "Spanien" },
  { value: "Niederlande", label: "Niederlande" },
  { value: "Belgien", label: "Belgien" },
  { value: "Dänemark", label: "Dänemark" },
  { value: "Schweden", label: "Schweden" },
  { value: "Norwegen", label: "Norwegen" },
  { value: "Polen", label: "Polen" },
  { value: "Ungarn", label: "Ungarn" },
  { value: "Griechenland", label: "Griechenland" },
  { value: "Portugal", label: "Portugal" },
  { value: "Großbritannien", label: "Großbritannien" },
];

const _wassertypOptions = [
  { value: "Küste / Meer", label: "Küste / Meer" },
  { value: "Fluss", label: "Fluss" },
  { value: "Badesee", label: "Badesee" },
  { value: "See", label: "See" },
  { value: "Hafen", label: "Hafen" },
  { value: "Bach", label: "Bach" },
  { value: "Kanal", label: "Kanal" },
  { value: "Teich", label: "Teich" },
  { value: "Stausee", label: "Stausee" },
];

type TimelineEntryWithJoins = TimelineEntry & {
  companies?: Pick<Company, "firmenname"> | null;
  contacts?: Pick<Contact, "vorname" | "nachname" | "position"> | null;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [edit, setEdit] = useState(false);
  const [_addContactDialog, _setAddContactDialog] = useState(false);
  const [_addReminderDialog, _setAddReminderDialog] = useState(false);
  const [_editFirmendaten, _setEditFirmendaten] = useState(false);
  const [_editAdresse, _setEditAdresse] = useState(false);
  const [_editAquaDock, _setEditAquaDock] = useState(false);
  const [_editCRM, _setEditCRM] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);
  const [_editContact, _setEditContact] = useState<Database["public"]["Tables"]["contacts"]["Row"] | null>(null);
  const [_contactDialogOpen, _setContactDialogOpen] = useState(false);
  const [_editReminder, _setEditReminder] = useState<Database["public"]["Tables"]["reminders"]["Row"] | null>(null);
  const [_reminderDialogOpen, _setReminderDialogOpen] = useState(false);

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

  const { data: linkedContacts = [] } = useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", id)
        .order("nachname")
        .order("vorname");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
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
    mutationFn: async (values: {
      title: string;
      content?: string;
      company_id?: string | null;
      contact_id?: string | null;
      activity_type?: string;
    }) => {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          company_id: preselectedCompanyId || values.company_id || "",
          user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      toast.success("Timeline-Eintrag erstellt");
      setTimelineDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        title: string;
        content?: string;
        company_id?: string | null;
        activity_type?: string;
      };
    }) => {
      const res = await fetch(`/api/timeline/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          company_id: values.company_id || editEntry?.company_id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      toast.success("Timeline-Eintrag aktualisiert");
      setTimelineDialogOpen(false);
      setEditEntry(null);
    },
  });

  const _deleteTimelineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timeline/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      toast.success("Timeline-Eintrag gelöscht");
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
          <Button
            variant="outline"
            onClick={() => {
              const referrer = document.referrer || "";
              if (referrer.includes("/contacts")) router.back();
              else router.push("/companies");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (edit) {
    return (
      <div className="container mx-auto p-6">
        <CompanyEditForm
          company={company}
          onSuccess={() => {
            setEdit(false);
            queryClient.invalidateQueries({ queryKey: ["company", id] });
          }}
        />
      </div>
    );
  }

  const _totalContacts = contacts.length;
  const _primaryContacts = contacts.filter((c) => c.is_primary).length;
  const _openReminders = reminders.filter((r) => r.status === "open").length;
  const _overdueReminders = reminders.filter(
    (r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date)),
  ).length;

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
          <Button
            variant="outline"
            onClick={() => {
              const referrer = document.referrer || "";
              if (referrer.includes("/contacts")) router.back();
              else router.push("/companies");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
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

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground">No contacts yet.</p>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {contact.vorname} {contact.nachname}
                    </p>
                    {contact.position && <p className="text-sm text-muted-foreground">{contact.position}</p>}
                    {contact.email && <p className="text-sm">{contact.email}</p>}
                    {contact.telefon && <p className="text-sm">{contact.telefon}</p>}
                  </div>
                  <Button
                    onClick={() => {
                      setEditContact(contact);
                      setContactDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    type="button"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reminders ({reminders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-muted-foreground">No reminders yet.</p>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{reminder.title}</h3>
                      <Badge
                        className={
                          reminder.priority === "hoch"
                            ? "bg-orange-500 text-white"
                            : reminder.priority === "normal"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-500 text-white"
                        }
                      >
                        {reminder.priority}
                      </Badge>
                      <Badge variant={reminder.status === "open" ? "default" : "secondary"}>{reminder.status}</Badge>
                    </div>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Due: {new Date(reminder.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setEditReminder(reminder);
                      setReminderDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    type="button"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline ({timeline.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground">No timeline entries yet.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{entry.activity_type}</h3>
                      <Badge variant="outline">{new Date(entry.created_at).toLocaleDateString()}</Badge>
                    </div>
                    {entry.notes && <p className="text-sm text-muted-foreground mb-2">{entry.notes}</p>}
                    {entry.contacts && (
                      <p className="text-sm">
                        Contact: {entry.contacts.vorname} {entry.contacts.nachname}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setEditEntry(entry);
                      setTimelineDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    type="button"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
      <Dialog
        open={timelineDialogOpen}
        onOpenChange={(open) => {
          setTimelineDialogOpen(open);
          if (!open) {
            setPreselectedCompanyId(null);
            setEditEntry(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editEntry ? "Edit Timeline Entry" : `Neuer Timeline-Eintrag für ${company?.firmenname}`}
            </DialogTitle>
            <DialogDescription>
              {editEntry ? "Edit the timeline entry." : "Add a new activity to the timeline."}
            </DialogDescription>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={async (values) => {
              if (editEntry?.id) {
                await updateMutation.mutateAsync({
                  id: editEntry.id,
                  values: { ...values, company_id: values.company_id || editEntry?.company_id || "" },
                });
              } else {
                await createTimelineMutation.mutateAsync(values);
              }
            }}
            isSubmitting={createTimelineMutation.isPending}
            companies={[]}
            contacts={linkedContacts}
            editEntry={editEntry}
            preselectedCompanyId={preselectedCompanyId}
            defaultValues={
              editEntry
                ? {
                    title: editEntry.title,
                    content: editEntry.content ?? "",
                    activity_type: editEntry.activity_type as any,
                    company_id: editEntry.company_id,
                    contact_id: editEntry.contact_id || "none",
                    user_name: editEntry.user_name,
                  }
                : {
                    company_id: company?.id || null,
                    contact_id: "none",
                  }
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
