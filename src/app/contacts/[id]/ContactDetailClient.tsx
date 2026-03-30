// src/app/contacts/[id]/ContactDetailClient.tsx
// This file defines the client component for the Contact Detail page, handling all interactive parts.
// It receives the contact and companies data as props and manages state for dialogs and forms.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building, Edit, Trash, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import type { ContactFormDTO } from "@/lib/dto/contact.dto";
import { createClient } from "@/lib/supabase/browser-client";
import type { Contact } from "@/lib/supabase/database.types";
import { deleteContact, getContactById, updateContact } from "@/lib/supabase/services/contacts";
import { safeDisplay } from "@/lib/utils/data-format";

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

type ContactFormValues = ContactFormDTO;

const anredeOptions = [
  { value: "Herr", label: "Herr" },
  { value: "Frau", label: "Frau" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
];

interface ContactDetailClientProps {
  contact: Contact;
  companies: { id: string; firmenname: string }[];
}

export default function ContactDetailClient({ contact: initialContact, companies }: ContactDetailClientProps) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [editDialog, setEditDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editCompanyDialog, setEditCompanyDialog] = useState(false);
  const [changeCompanyDialog, setChangeCompanyDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: contact } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => getContactById(id, createClient()),
    initialData: initialContact,
  });

  const { data: linkedCompany } = useQuery({
    queryKey: ["company", contact?.company_id],
    queryFn: async () => {
      if (!contact?.company_id) return null;
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("*").eq("id", contact.company_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!contact?.company_id,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("edit") === "true") {
      setEditDialog(true);
    }
  }, []);

  useEffect(() => {
    if (contact) {
      setNotesValue(contact.notes || "");
    }
  }, [contact]);

  if (!contact) {
    return <div>Contact not found</div>;
  }

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
    if (!contact) return;
    try {
      const supabase = createClient();
      await updateContact(contact.id, { notes: notesValue }, supabase);
      toast.success("Notes updated");
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
    } catch (error) {
      toast.error("Failed to update notes", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">
            Contacts → {contact.vorname} {contact.nachname}
          </div>
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
          {contact.created_at && (
            <span className="text-sm text-gray-500" suppressHydrationWarning={true}>
              Created: {new Date(contact.created_at).toLocaleDateString()}
            </span>
          )}
          {contact.updated_at && (
            <span className="text-sm text-gray-500" suppressHydrationWarning={true}>
              Updated: {new Date(contact.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="primary-contact"
            checked={contact.is_primary || false}
            onCheckedChange={async (checked) => {
              const supabase = createClient();
              try {
                await updateContact(contact.id, { is_primary: !!checked }, supabase);
                toast.success("Primary contact updated");
                queryClient.invalidateQueries({ queryKey: ["contact", id] });
              } catch (err) {
                toast.error("Update failed", { description: (err as Error).message });
              }
            }}
          />
          <label htmlFor="primary-contact" className="text-sm font-medium text-gray-700">
            Primary Contact
          </label>
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
              <div className="text-sm font-medium text-gray-700">Vorname</div>
              <p className="text-sm text-gray-900">{safeDisplay(contact.vorname)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Nachname</div>
              <p className="text-sm text-gray-900">{safeDisplay(contact.nachname)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Anrede</div>
              <p className="text-sm text-gray-900">{safeDisplay(contact.anrede)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Position</div>
              <p className="text-sm text-gray-900">{safeDisplay(contact.position)}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Email</div>
              <p className="text-sm text-gray-900">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                ) : (
                  safeDisplay(null)
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Telefon</div>
              <p className="text-sm text-gray-900">
                {contact.telefon ? (
                  <a href={`tel:${contact.telefon}`} className="text-blue-600 hover:underline">
                    {contact.telefon}
                  </a>
                ) : (
                  safeDisplay(null)
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Mobil</div>
              <p className="text-sm text-gray-900">
                {contact.mobil ? (
                  <a href={`tel:${contact.mobil}`} className="text-blue-600 hover:underline">
                    {contact.mobil}
                  </a>
                ) : (
                  safeDisplay(null)
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Durchwahl</div>
              <p className="text-sm text-gray-900">{safeDisplay(contact.durchwahl)}</p>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Notes
                <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              {editingNotes ? (
                <div>
                  <Textarea
                    value={notesValue}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesValue(e.target.value)}
                  />
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
                <p className="text-sm text-gray-900">{safeDisplay(contact.notes)}</p>
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
          {linkedCompany ? (
            <div className="space-y-3">
              <div>
                <a
                  href={`/companies/${linkedCompany.id}`}
                  className="text-lg font-semibold hover:underline text-primary flex items-center gap-2"
                >
                  {linkedCompany.firmenname}
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                {linkedCompany.kundentyp && (
                  <Badge variant="secondary">
                    {linkedCompany.kundentyp.charAt(0).toUpperCase() + linkedCompany.kundentyp.slice(1)}
                  </Badge>
                )}
                {linkedCompany.status && (
                  <Badge
                    className={
                      linkedCompany.status === "gewonnen"
                        ? "bg-emerald-600 text-white"
                        : linkedCompany.status === "lead"
                          ? "bg-amber-600 text-white"
                          : "bg-zinc-500 text-white"
                    }
                  >
                    {linkedCompany.status}
                  </Badge>
                )}
                {linkedCompany.wassertyp && <Badge variant="outline">{linkedCompany.wassertyp}</Badge>}
                {linkedCompany.wasserdistanz && <Badge variant="outline">{linkedCompany.wasserdistanz} m</Badge>}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                {(linkedCompany.stadt || linkedCompany.land) && (
                  <p>
                    {linkedCompany.stadt}
                    {linkedCompany.stadt && linkedCompany.land && ", "}
                    {linkedCompany.land}
                  </p>
                )}
                {linkedCompany.osm && (
                  <a
                    href={linkedCompany.osm}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    OSM Link →
                  </a>
                )}
              </div>

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
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <EditContactForm
            contact={contact}
            onSuccess={() => {
              setEditDialog(false);
              queryClient.invalidateQueries({ queryKey: ["contact", id] });
            }}
          />
        </WideDialogContent>
      </Dialog>

      {/* Edit Company Dialog - now safe (full Company type) */}
      <Dialog open={editCompanyDialog} onOpenChange={setEditCompanyDialog}>
        <WideDialogContent size="2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={linkedCompany || null}
            onSuccess={() => {
              setEditCompanyDialog(false);
              queryClient.invalidateQueries({ queryKey: ["contact", id] });
              queryClient.invalidateQueries({ queryKey: ["company", contact.company_id] });
            }}
          />
        </WideDialogContent>
      </Dialog>

      {/* Change Company Dialog */}
      <Dialog open={changeCompanyDialog} onOpenChange={setChangeCompanyDialog}>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Change Linked Company</DialogTitle>
          </DialogHeader>
          <Select
            onValueChange={async (value) => {
              const supabase = createClient();
              try {
                await updateContact(contact.id, { company_id: value === "none" ? null : value }, supabase);
                toast.success("Company updated");
                await queryClient.invalidateQueries({ queryKey: ["contact", id] });
                await queryClient.invalidateQueries({ queryKey: ["company", value === "none" ? null : value] });
                setChangeCompanyDialog(false);
              } catch (err) {
                toast.error("Update failed", {
                  description: (err as Error).message,
                });
              }
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
        </WideDialogContent>
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
      anrede: contact.anrede || undefined,
      position: contact.position || undefined,
      email: contact.email || undefined,
      telefon: contact.telefon || undefined,
      mobil: contact.mobil || undefined,
      durchwahl: contact.durchwahl || undefined,
      notes: contact.notes || undefined,
      company_id: contact.company_id || null,
      is_primary: contact.is_primary || undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const supabase = createClient();
      await updateContact(contact.id, data, supabase);
      toast.success("Contact updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update contact", {
        description: (error as Error).message,
      });
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
                    <SelectItem key={option.value} value={option.label}>
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
