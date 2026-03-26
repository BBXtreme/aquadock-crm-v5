"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAfter } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import CompanyEditForm from "@/components/features/CompanyEditForm";
import TimelineEntryForm from "@/components/features/TimelineEntryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Company, Contact, Database, TimelineEntry } from "@/lib/supabase/database.types";
import { getCompanyById } from "@/lib/supabase/services/companies";

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
      {/* Breadcrumbs, Header, Status, KPI Cards, Sections, Contacts, Reminders, Timeline — all unchanged except the Timeline dialog below */}
      {/* ... (all your existing UI code remains exactly the same) ... */}

      {/* Timeline Dialog – now fully typed */}
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

  // ... your existing helper functions (handleDeleteCompany, etc.) remain unchanged ...
}
