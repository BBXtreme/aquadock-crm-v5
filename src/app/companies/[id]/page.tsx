"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { isAfter } from "date-fns";
import { ArrowLeft, BarChart, Bell, Building, Calendar, Edit, MapPin, Plus, Trash, User, Waves } from "lucide-react";
import { toast } from "sonner";

import CompanyEditForm from "@/components/features/CompanyEditForm";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { deleteCompany } from "@/lib/supabase/services/companies";
import { deleteContact, getContacts } from "@/lib/supabase/services/contacts";
import { deleteReminder, getReminders } from "@/lib/supabase/services/reminders";
import { getTimeline } from "@/lib/supabase/services/timeline";
import type { Company, Contact, Reminder, TimelineEntry } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [addReminderDialog, setAddReminderDialog] = useState(false);

  const fetchData = async () => {
    if (!id || id === "undefined") {
      setError("Invalid company ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

      if (companyError) {
        setError(companyError.message);
        return;
      }

      setCompany(companyData);

      // Fetch contacts
      const allContacts = await getContacts(supabase);
      setContacts(allContacts.filter((c) => c.company_id === id));

      // Fetch reminders
      const allReminders = await getReminders(supabase);
      setReminders(allReminders.filter((r) => r.company_id === id));

      // Fetch timeline
      const allTimeline = await getTimeline(supabase);
      setTimeline(allTimeline.filter((t) => t.company_id === id));
    } catch (_err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  const handleDeleteCompany = async () => {
    if (confirm("Are you sure you want to delete this company?")) {
      try {
        const supabase = createClient();
        await deleteCompany(id, supabase);
        router.push("/companies");
      } catch (_error) {
        toast.error("Failed to delete company");
      }
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        const supabase = createClient();
        await deleteContact(contactId, supabase);
        fetchData();
      } catch (_error) {
        toast.error("Failed to delete contact");
      }
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      try {
        const supabase = createClient();
        await deleteReminder(reminderId, supabase);
        fetchData();
      } catch (_error) {
        toast.error("Failed to delete reminder");
      }
    }
  };

  const getKundentypLabel = (t: string) => {
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
    return map[t] || t;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
            <Button onClick={() => router.push("/companies")}>Back to Companies</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (edit) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <CompanyEditForm
            company={company}
            onSuccess={() => {
              setEdit(false);
              fetchData();
            }}
          />
        </div>
      </AppLayout>
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
    <AppLayout>
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
          {company.kundentyp && (
            <Badge className="bg-[#24BACC] text-white">{getKundentypLabel(company.kundentyp)}</Badge>
          )}
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
          {company.created_at && (
            <span className="text-sm text-gray-500">Created: {new Date(company.created_at).toLocaleDateString()}</span>
          )}
          {company.updated_at && (
            <span className="text-sm text-gray-500">Updated: {new Date(company.updated_at).toLocaleDateString()}</span>
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
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Firmendaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Firmenname</label>
                  <p className="text-sm text-gray-900">{company.firmenname || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rechtsform</label>
                  <p className="text-sm text-gray-900">{company.rechtsform || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Kundentyp</label>
                  <p className="text-sm text-gray-900">{company.kundentyp || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Firmentyp</label>
                  <p className="text-sm text-gray-900">
                    {company.firmentyp === "kette" ? "Kette" : company.firmentyp === "einzeln" ? "Einzelbetrieb" : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Website</label>
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
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
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
                  <label className="text-sm font-medium text-gray-700">Email</label>
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
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Strasse</label>
                  <p className="text-sm text-gray-900">{company.strasse || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">PLZ</label>
                  <p className="text-sm text-gray-900">{company.plz || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stadt</label>
                  <p className="text-sm text-gray-900">{company.stadt || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Bundesland</label>
                  <p className="text-sm text-gray-900">{company.bundesland || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Land</label>
                  <p className="text-sm text-gray-900">{company.land || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AquaDock Daten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="w-5 h-5" />
                AquaDock Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Wasserdistanz</label>
                  <p className="text-sm text-gray-900">{company.wasserdistanz ? `${company.wasserdistanz} m` : "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Wassertyp</label>
                  <p className="text-sm text-gray-900">{company.wassertyp || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Latitude</label>
                  <p className="text-sm text-gray-900">{company.lat || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Longitude</label>
                  <p className="text-sm text-gray-900">{company.lon || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">OSM</label>
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
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                CRM Informationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{company.status || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Value</label>
                  <p className="text-sm text-gray-900">
                    {company.value ? `€${company.value.toLocaleString("de-DE")}` : "—"}
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900">{company.notes || "—"}</p>
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
              <Button onClick={() => setAddContactDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-gray-500">No contacts linked to this company.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        {contact.vorname} {contact.nachname}
                      </TableCell>
                      <TableCell>{contact.position || "—"}</TableCell>
                      <TableCell>{contact.email || "—"}</TableCell>
                      <TableCell>{contact.telefon || "—"}</TableCell>
                      <TableCell>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/contacts?edit=${contact.id}`)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDeleteContact(contact.id)} size="sm" variant="destructive">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Button onClick={() => setAddReminderDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-gray-500">No reminders for this company.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell>{reminder.title}</TableCell>
                      <TableCell>{new Date(reminder.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={reminder.priority === "high" ? "destructive" : "secondary"}>
                          {reminder.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={reminder.status === "open" ? "default" : "secondary"}>{reminder.status}</Badge>
                      </TableCell>
                      <TableCell>{reminder.assigned_to || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/reminders?edit=${reminder.id}`)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDeleteReminder(reminder.id)} size="sm" variant="destructive">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline ({timeline.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-gray-500">No timeline entries for this company.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.event_date).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.title}</TableCell>
                      <TableCell>{entry.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Contact Dialog */}
        <Dialog open={addContactDialog} onOpenChange={setAddContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div>
              <p>Feature not implemented yet. Please use the Contacts page to add a new contact.</p>
              <Button
                onClick={() => {
                  setAddContactDialog(false);
                  router.push("/contacts");
                }}
                className="mt-4"
              >
                Go to Contacts
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Reminder Dialog */}
        <Dialog open={addReminderDialog} onOpenChange={setAddReminderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Reminder</DialogTitle>
            </DialogHeader>
            <div>
              <p>Feature not implemented yet. Please use the Reminders page to add a new reminder.</p>
              <Button
                onClick={() => {
                  setAddReminderDialog(false);
                  router.push("/reminders");
                }}
                className="mt-4"
              >
                Go to Reminders
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
