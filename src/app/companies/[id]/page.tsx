"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAfter } from "date-fns";
import { ArrowLeft, BarChart, Bell, Building, Calendar, Edit, MapPin, Plus, Trash, User, Waves } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { deleteCompany, getCompanyById } from "@/lib/supabase/services/companies";
import type { Company, Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

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
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
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
  value: z.number().optional(),
  notes: z.string().optional(),
});

type FirmendatenFormValues = z.infer<typeof firmendatenSchema>;
type AdresseFormValues = z.infer<typeof adresseSchema>;
type AquaDockFormValues = z.infer<typeof aquaDockSchema>;
type CRMFormValues = z.infer<typeof crmSchema>;

const kundentypOptions = [
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

const firmentypOptions = [
  { value: "kette", label: "Kette" },
  { value: "einzeln", label: "Einzelbetrieb" },
];

const statusOptions = [
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

const landOptions = [
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

const wassertypOptions = [
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

type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"] & {
  companies?: Pick<Company, "firmenname"> | null;
  contacts?: {
    vorname: string | null;
    nachname: string | null;
  } | null;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [edit, setEdit] = useState(false);
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [addReminderDialog, setAddReminderDialog] = useState(false);
  const [editFirmendaten, setEditFirmendaten] = useState(false);
  const [editAdresse, setEditAdresse] = useState(false);
  const [editAquaDock, setEditAquaDock] = useState(false);
  const [editCRM, setEditCRM] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TimelineEntry | null>(null);
  const [editContact, setEditContact] = useState<any>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<any>(null);
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

  const { data: linkedContacts = [] } = useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, email, telefon, position")
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
    mutationFn: async (values: { title: string; content?: string; company_id: string; activity_type?: string }) => {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          company_id: preselectedCompanyId || values.company_id,
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
      values: { title: string; content?: string; company_id: string; activity_type?: string };
    }) => {
      const res = await fetch(`/api/timeline/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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

  const deleteTimelineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timeline/${id}`, {
        method: "DELETE",
      });
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
              if (referrer.includes("/contacts")) {
                router.back(); // returns to contacts or contact detail
              } else {
                router.push("/companies"); // fallback
              }
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
              if (referrer.includes("/contacts")) {
                router.back(); // return to contacts or contact detail
              } else {
                router.push("/companies"); // fallback
              }
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
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

  // Calculate stats
  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.is_primary).length;
  const openReminders = reminders.filter((r) => r.status === "open").length;
  const overdueReminders = reminders.filter(
    (r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date)),
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600">
        <Link href="/companies" className="hover:underline">
          Companies
        </Link>{" "}
        &gt; {company.firmenname}
      </nav>

      {/* Header */}
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
              setPreselectedCompanyId(company.id);
              setTimelineDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Timeline
          </Button>
          <Button onClick={() => setEdit(true)} variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button onClick={handleDeleteCompany} variant="destructive" size="sm">
            <Trash className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push("/companies")} size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status and Badges */}
      <div className="flex items-center gap-4">
        <Badge
          className={cn(
            company.status === "won" && "bg-emerald-600 text-white",
            company.status === "lost" && "bg-rose-600 text-white",
            company.status === "lead" && "bg-amber-600 text-white",
            !["won", "lost", "lead"].includes(company.status) && "bg-zinc-500 text-white",
          )}
        >
          {company.status}
        </Badge>
        {company.kundentyp && <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>}
        {company.firmentyp && (
          <Badge variant="outline">
            {company.firmentyp === "kette" ? "Chain" : company.firmentyp === "einzeln" ? "Single" : "—"}
          </Badge>
        )}
        {company.wassertyp && (
          <Badge variant="outline">
            <Waves className="w-3 h-3 mr-1" />
            {company.wassertyp}
          </Badge>
        )}
        {(company as any).created_at && (
          <span className="text-sm text-gray-500">
            Created: {new Date((company as any).created_at).toLocaleDateString()}
          </span>
        )}
        {(company as any).updated_at && (
          <span className="text-sm text-gray-500">
            Updated: {new Date((company as any).updated_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Primary Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{primaryContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Open Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{openReminders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Overdue Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">{overdueReminders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sections in two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Firmendaten */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Firmendaten
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditFirmendaten(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Firmenname</div>
                <p className="text-sm text-gray-900">{company.firmenname || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Rechtsform</div>
                <p className="text-sm text-gray-900">{company.rechtsform || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Kundentyp</div>
                <p className="text-sm text-gray-900">
                  {company.kundentyp ? company.kundentyp.charAt(0).toUpperCase() + company.kundentyp.slice(1) : "—"}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Firmentyp</div>
                <p className="text-sm text-gray-900">
                  {company.firmentyp === "kette" ? "Kette" : company.firmentyp === "einzeln" ? "Einzelbetrieb" : "—"}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Website</div>
                <p className="text-sm text-gray-900">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Telefon</div>
                <p className="text-sm text-gray-900">
                  {company.telefon ? (
                    <a href={`tel:${company.telefon}`} className="text-blue-600 hover:underline">
                      {company.telefon}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Email</div>
                <p className="text-sm text-gray-900">
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                      {company.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adresse */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adresse
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditAdresse(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Strasse</div>
                <p className="text-sm text-gray-900">{company.strasse || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">PLZ</div>
                <p className="text-sm text-gray-900">{company.plz || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Stadt</div>
                <p className="text-sm text-gray-900">{company.stadt || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Bundesland</div>
                <p className="text-sm text-gray-900">{company.bundesland || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Land</div>
                <p className="text-sm text-gray-900">{company.land || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AquaDock Daten */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Waves className="w-5 h-5" />
                AquaDock Daten
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditAquaDock(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Wasserdistanz</div>
                <p className="text-sm text-gray-900">{company.wasserdistanz ? `${company.wasserdistanz} m` : "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Wassertyp</div>
                <p className="text-sm text-gray-900">{company.wassertyp || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Latitude</div>
                <p className="text-sm text-gray-900">{company.lat || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Longitude</div>
                <p className="text-sm text-gray-900">{company.lon || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">OSM</div>
                <p className="text-sm text-gray-900">
                  {company.osm ? (
                    <a
                      href={company.osm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.osm}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CRM Informationen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                CRM Informationen
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditCRM(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Status</div>
                <p className="text-sm text-gray-900">{company.status || "—"}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Value</div>
                <p className="text-sm text-gray-900">
                  {(company as any).value ? `€${(company as any).value.toLocaleString("de-DE")}` : "—"}
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="text-sm font-medium text-gray-700">Notes</div>
                <p className="text-sm text-gray-900">{(company as any).notes || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Contacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Linked Contacts ({contacts.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setAddContactDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-gray-500">No contacts linked to this company.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Position</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Primary</th>
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                        {contact.vorname} {contact.nachname}
                      </Link>
                    </td>
                    <td>{contact.position || "—"}</td>
                    <td>{contact.email || "—"}</td>
                    <td>{contact.telefon || "—"}</td>
                    <td>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditContact(contact);
                            setContactDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminders ({reminders.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setAddReminderDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-gray-500">No reminders for this company.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Title</th>
                  <th className="text-left">Due Date</th>
                  <th className="text-left">Priority</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Assigned To</th>
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td className="font-medium">
                      <button
                        type="button"
                        className="text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          setEditReminder(reminder);
                          setReminderDialogOpen(true);
                        }}
                      >
                        {reminder.title}
                      </button>
                    </td>
                    <td>{new Date(reminder.due_date).toLocaleDateString()}</td>
                    <td>
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
                    </td>
                    <td>
                      <Badge variant={reminder.status === "open" ? "default" : "secondary"}>{reminder.status}</Badge>
                    </td>
                    <td>{reminder.assigned_to || "—"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditReminder(reminder);
                            setReminderDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteReminder(reminder.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline ({timeline.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimelineDialogOpen(true);
                setPreselectedCompanyId(company.id);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Timeline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-gray-500">No timeline entries for this company.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Event</th>
                  <th className="text-left">Company</th>
                  <th className="text-left">Contact</th>
                  <th className="text-left">User</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td>
                      {entry.title} ({entry.activity_type})
                    </td>
                    <td>{entry.companies?.firmenname || "—"}</td>
                    <td>{entry.contacts ? `${entry.contacts.vorname} ${entry.contacts.nachname}` : "—"}</td>
                    <td>{entry.user_name || "—"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditEntry(entry);
                            setTimelineDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm("Delete this timeline entry?")) {
                              deleteTimelineMutation.mutate(entry.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Edit Firmendaten Dialog */}
      <Dialog open={editFirmendaten} onOpenChange={setEditFirmendaten}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Firmendaten</DialogTitle>
          </DialogHeader>
          <FirmendatenForm
            company={company}
            onSuccess={() => {
              setEditFirmendaten(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Adresse Dialog */}
      <Dialog open={editAdresse} onOpenChange={setEditAdresse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Adresse</DialogTitle>
          </DialogHeader>
          <AdresseForm
            company={company}
            onSuccess={() => {
              setEditAdresse(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit AquaDock Dialog */}
      <Dialog open={editAquaDock} onOpenChange={setEditAquaDock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AquaDock Daten</DialogTitle>
          </DialogHeader>
          <AquaDockForm
            company={company}
            onSuccess={() => {
              setEditAquaDock(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit CRM Dialog */}
      <Dialog open={editCRM} onOpenChange={setEditCRM}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit CRM Informationen</DialogTitle>
          </DialogHeader>
          <CRMForm
            company={company}
            onSuccess={() => {
              setEditCRM(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialog} onOpenChange={setAddContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact to {company.firmenname}</DialogTitle>
          </DialogHeader>
          <ContactCreateForm
            companyId={company.id}
            onSuccess={() => {
              setAddContactDialog(false);
              queryClient.invalidateQueries({ queryKey: ["contacts", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={addReminderDialog} onOpenChange={setAddReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder for {company.firmenname}</DialogTitle>
          </DialogHeader>
          <ReminderCreateForm
            onSuccess={() => {
              setAddReminderDialog(false);
              queryClient.invalidateQueries({ queryKey: ["reminders", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            contact={editContact}
            onSuccess={() => {
              setContactDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["contacts", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <ReminderEditForm
            reminder={editReminder}
            onSuccess={() => {
              setReminderDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["reminders", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Timeline Dialog */}
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
                await updateMutation.mutateAsync({ id: editEntry.id, values });
              } else {
                await createTimelineMutation.mutateAsync(values);
              }
            }}
            isSubmitting={createTimelineMutation.isPending}
            companies={[]} // vorerst leer – preselect übernimmt
            contacts={linkedContacts}
            editEntry={editEntry}
            preselectedCompanyId={preselectedCompanyId}
            defaultValues={
              editEntry
                ? {
                    title: editEntry.title,
                    content: editEntry.content,
                    activity_type: editEntry.activity_type,
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

  function handleDeleteCompany() {
    if (confirm("Are you sure you want to delete this company?")) {
      try {
        deleteCompany(id);
        router.push("/companies");
      } catch (_error) {
        toast.error("Failed to delete company");
      }
    }
  }

  function handleDeleteContact(contactId: string) {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        const supabase = createClient();
        supabase.from("contacts").delete().eq("id", contactId);
        queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      } catch (_error) {
        toast.error("Failed to delete contact");
      }
    }
  }

  function handleDeleteReminder(reminderId: string) {
    if (confirm("Are you sure you want to delete this reminder?")) {
      try {
        const supabase = createClient();
        supabase.from("reminders").delete().eq("id", reminderId);
        queryClient.invalidateQueries({ queryKey: ["reminders", id] });
      } catch (_error) {
        toast.error("Failed to delete reminder");
      }
    }
  }

  function getKundentypLabel(t: string) {
    const map = {
      restaurant: "🍽 Restaurant",
      hotel: "🏨 Hotel",
      resort: "🌴 Resort",
      camping: "⛺ Camping",
      marina: "⚓ Marina",
      segelschule: "⛵ Segelschule",
      segelverein: "🏆 Segelverein",
      bootsverleih: "🚤 Bootsverleih",
      neukunde: "🆕 Neukunde",
      bestandskunde: "⭐ Bestandskunde",
      interessent: "👁 Interessent",
      partner: "🤝 Partner",
      sonstige: "Sonstige",
    };
    return map[t.toLowerCase() as keyof typeof map] || t;
  }
}

function FirmendatenForm({ company, onSuccess }: { company: Company; onSuccess: () => void }) {
  const form = useForm<FirmendatenFormValues>({
    resolver: zodResolver(firmendatenSchema),
    defaultValues: {
      firmenname: company.firmenname || "",
      rechtsform: company.rechtsform || "",
      kundentyp: company.kundentyp || "",
      firmentyp: company.firmentyp || "",
      website: company.website || "",
      telefon: company.telefon || "",
      email: company.email || "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companies").update(data).eq("id", company.id);
      if (error) throw error;
      toast.success("Firmendaten updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update", { description: error.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="firmenname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmenname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rechtsform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rechtsform</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kundentyp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kundentyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {kundentypOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firmentyp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmentyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {firmentypOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

function AdresseForm({ company, onSuccess }: { company: Company; onSuccess: () => void }) {
  const form = useForm<AdresseFormValues>({
    resolver: zodResolver(adresseSchema),
    defaultValues: {
      strasse: company.strasse || "",
      plz: company.plz || "",
      stadt: company.stadt || "",
      bundesland: company.bundesland || "",
      land: company.land || "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companies").update(data).eq("id", company.id);
      if (error) throw error;
      toast.success("Adresse updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update", { description: error.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="strasse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strasse</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plz"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PLZ</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stadt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stadt</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bundesland"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bundesland</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="land"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Land</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {landOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

function AquaDockForm({ company, onSuccess }: { company: Company; onSuccess: () => void }) {
  const form = useForm<AquaDockFormValues>({
    resolver: zodResolver(aquaDockSchema),
    defaultValues: {
      wasserdistanz: company.wasserdistanz || 0,
      wassertyp: company.wassertyp || "",
      lat: company.lat || 0,
      lon: company.lon || 0,
      osm: company.osm || "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companies").update(data).eq("id", company.id);
      if (error) throw error;
      toast.success("AquaDock Daten updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update", { description: error.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="wasserdistanz"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wasserdistanz</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wassertyp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wassertyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select water type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {wassertypOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="osm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OSM</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

function CRMForm({ company, onSuccess }: { company: Company; onSuccess: () => void }) {
  const form = useForm<CRMFormValues>({
    resolver: zodResolver(crmSchema),
    defaultValues: {
      status: company.status || "",
      value: company.value || 0,
      notes: company.notes || "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companies").update(data).eq("id", company.id);
      if (error) throw error;
      toast.success("CRM Informationen updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update", { description: error.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
