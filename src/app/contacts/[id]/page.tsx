"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building, Edit, Trash, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import CompanyEditForm from "@/components/features/CompanyEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { deleteContact, updateContact } from "@/lib/supabase/services/contacts";
import type { Contact } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  vorname: z.string().min(1, "Vorname is required"),
  nachname: z.string().min(1, "Nachname is required"),
  anrede: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefon: z.string().optional(),
  mobil: z.string().optional(),
  durchwahl: z.string().optional(),
  notes: z.string().optional(),
  company_id: z.string().nullable().optional(),
  is_primary: z.boolean().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const anredeOptions = [
  { value: "Herr", label: "Herr" },
  { value: "Frau", label: "Frau" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
];

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editCompanyDialog, setEditCompanyDialog] = useState(false);
  const [changeCompanyDialog, setChangeCompanyDialog] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname");
      if (error) throw error;
      return data;
    },
  });

  const _fetchData = useCallback(async () => {
    if (!id || id === "undefined") {
      setError("Invalid contact ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/contacts/${id}`);
      const data = await response.json();
      if (data.success) {
        setContact(data.contact);
        setNotesValue(data.contact.notes || "");
      } else {
        setError(data.error || "Failed to load contact");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 15000);

    const loadData = async () => {
      try {
        if (!id || id === "undefined") {
          setError("Invalid contact ID");
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data, error } = await supabase
          .from("contacts")
          .select("*, companies!company_id(id, firmenname, kundentyp, status, value, stadt, land)")
          .eq("id", id)
          .single();

        if (error) {
          setError(error.message);
          return;
        }

        setContact(data);
        setNotesValue(data.notes || "");
      } catch (err) {
        console.error(err);
        setError("Failed to load contact");
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    loadData();

    return () => clearTimeout(timeout);
  }, [id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("edit") === "true") {
      setEditDialog(true);
    }
  }, []);

  const handleDeleteContact = async () => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        const supabase = createClient();
        await deleteContact(id, supabase);
        router.push("/contacts");
      } catch (_error) {
        toast.error("Failed to delete contact");
      }
    }
  };

  const handleSaveNotes = async () => {
    try {
      const supabase = createClient();
      await updateContact(contact?.id, { notes: notesValue }, supabase);
      toast.success("Notes updated");
      setEditingNotes(false);
      _fetchData();
    } catch (error) {
      toast.error("Failed to update notes", { description: error.message });
    }
  };

  if (loading) {
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
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contact Not Found</h1>
          <Button onClick={() => router.push("/contacts")}>Back to Contacts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Contacts → {contact.vorname} {contact.nachname}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {contact.vorname} {contact.nachname}
          </h1>
          {contact.position && <p className="text-muted-foreground mt-1">{contact.position}</p>}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setEditDialog(true)} variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button onClick={handleDeleteContact} variant="destructive" size="sm">
            <Trash className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push("/contacts")} size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Badges and Primary Contact Checkbox */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {contact.is_primary && <Badge variant="secondary">Primary Contact</Badge>}
          {contact.anrede && <Badge variant="outline">{contact.anrede}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={contact.is_primary}
            onCheckedChange={(checked) => {
              const supabase = createClient();
              updateContact(contact.id, { is_primary: checked }, supabase)
                .then(() => {
                  toast.success("Primary contact updated");
                  _fetchData();
                })
                .catch((err) => {
                  toast.error("Update failed", { description: err.message });
                });
            }}
          />
          <label className="text-sm font-medium text-gray-700">Primary Contact</label>
        </div>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Vorname</label>
              <p className="text-sm text-gray-900">{contact.vorname || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nachname</label>
              <p className="text-sm text-gray-900">{contact.nachname || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Anrede</label>
              <p className="text-sm text-gray-900">{contact.anrede || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Position</label>
              <p className="text-sm text-gray-900">{contact.position || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Telefon</label>
              <p className="text-sm text-gray-900">
                {contact.telefon ? (
                  <a href={`tel:${contact.telefon}`} className="text-blue-600 hover:underline">
                    {contact.telefon}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mobil</label>
              <p className="text-sm text-gray-900">
                {contact.mobil ? (
                  <a href={`tel:${contact.mobil}`} className="text-blue-600 hover:underline">
                    {contact.mobil}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Durchwahl</label>
              <p className="text-sm text-gray-900">{contact.durchwahl || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Notes
                <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </label>
              {editingNotes ? (
                <div>
                  <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(contact.notes || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900">{contact.notes || "—"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Company */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Linked Company
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {contact.companies ? (
            <div className="space-y-3">
              <div>
                <Link
                  href={`/companies/${contact.companies.id}`}
                  className="text-lg font-semibold hover:underline text-primary flex items-center gap-2"
                >
                  {contact.companies.firmenname}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {contact.companies.kundentyp && (
                  <Badge variant="secondary">
                    {contact.companies.kundentyp.charAt(0).toUpperCase() + contact.companies.kundentyp.slice(1)}
                  </Badge>
                )}
                {contact.companies.status && (
                  <Badge
                    className={cn(
                      contact.companies.status === "gewonnen" && "bg-emerald-600",
                      contact.companies.status === "lead" && "bg-amber-600",
                      !["gewonnen", "lead"].includes(contact.companies.status) && "bg-zinc-500"
                    )}
                  >
                    {contact.companies.status}
                  </Badge>
                )}
                {contact.companies.value && (
                  <Badge variant="outline">
                    €{contact.companies.value.toLocaleString("de-DE")}
                  </Badge>
                )}
              </div>

              {contact.companies.stadt && contact.companies.land && (
                <p className="text-sm text-muted-foreground">
                  {contact.companies.stadt}, {contact.companies.land}
                </p>
              )}

              <Button variant="outline" size="sm" onClick={() => setChangeCompanyDialog(true)}>
                Change Company
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">No company linked yet.</p>
              <Button variant="outline" size="sm" onClick={() => setChangeCompanyDialog(true)}>
                Link Company
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <EditContactForm
            contact={contact}
            onSuccess={() => {
              setEditDialog(false);
              _fetchData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={editCompanyDialog} onOpenChange={setEditCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={contact.companies}
            onSuccess={() => {
              setEditCompanyDialog(false);
              _fetchData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Change Company Dialog */}
      <Dialog open={changeCompanyDialog} onOpenChange={setChangeCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Linked Company</DialogTitle>
          </DialogHeader>
          <Select
            onValueChange={(value) => {
              const supabase = createClient();
              updateContact(contact.id, { company_id: value === "none" ? null : value }, supabase)
                .then(() => {
                  toast.success("Company updated");
                  _fetchData();
                  setChangeCompanyDialog(false);
                })
                .catch((err) => {
                  toast.error("Update failed", { description: err.message });
                });
            }}
            defaultValue={contact.company_id || "none"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.firmenname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditContactForm({ contact, onSuccess }: { contact: Contact; onSuccess: () => void }) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      vorname: contact.vorname || "",
      nachname: contact.nachname || "",
      anrede: contact.anrede || "",
      position: contact.position || "",
      email: contact.email || "",
      telefon: contact.telefon || "",
      mobil: contact.mobil || "",
      durchwahl: contact.durchwahl || "",
      notes: contact.notes || "",
      company_id: contact.company_id || null,
      is_primary: contact.is_primary || false,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      await updateContact(contact.id, data, supabase);
      toast.success("Contact updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update contact", { description: error.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="vorname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vorname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nachname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nachname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="anrede"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anrede</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anrede" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {anredeOptions.map((option) => (
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
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
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
          name="mobil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobil</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="durchwahl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durchwahl</FormLabel>
              <FormControl>
                <Input {...field} />
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
        <FormField
          control={form.control}
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Primary Contact</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
