"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Building, Edit, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/browser-client";
import type { Contact } from "@/lib/supabase/database.types";
import { getContactById, updateContact } from "@/lib/supabase/services/contacts";
import { safeDisplay } from "@/lib/utils/data-format";

interface ContactDetailClientProps {
  contact: Contact;
  companies: { id: string; firmenname: string }[];
}

export default function ContactDetailClient({ contact: initialContact, companies }: ContactDetailClientProps) {
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [changeCompanyDialogOpen, setChangeCompanyDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialContact.company_id || "");

  const contactQuery = useSuspenseQuery({
    queryKey: ["contact", initialContact.id],
    queryFn: async () => {
      const supabase = createClient();
      return getContactById(initialContact.id, supabase);
    },
    initialData: initialContact,
  });

  const contact = contactQuery.data; // useSuspenseQuery ensures data is available

  const companiesQuery = useSuspenseQuery({
    queryKey: ["companies-light"],
    queryFn: async () => {
      const supabase = createClient();
      return supabase.from("companies").select("id, firmenname").order("firmenname");
    },
  });

  const handleChangeCompany = async () => {
    try {
      await updateContact(contact.id, { company_id: selectedCompanyId }, createClient());
      toast.success("Company linked successfully");
      setChangeCompanyDialogOpen(false);
      // Invalidate to refetch contact data
      contactQuery.refetch();
    } catch (_error) {
      toast.error("Failed to change company");
    }
  };

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Contacts → {safeDisplay(contact.vorname)} {safeDisplay(contact.nachname)}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {safeDisplay(contact.vorname)} {safeDisplay(contact.nachname)}
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
            </DialogHeader>
            {/* Edit form would go here - assuming ContactEditForm component */}
            <div className="text-sm text-muted-foreground">
              Edit form implementation needed
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">First Name</span>
                  <p className="text-lg">{safeDisplay(contact.vorname)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Last Name</span>
                  <p className="text-lg">{safeDisplay(contact.nachname)}</p>
                </div>
              </div>

              {contact.anrede && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Salutation</span>
                  <Badge variant="outline">{contact.anrede}</Badge>
                </div>
              )}

              {contact.position && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Position</span>
                  <p>{contact.position}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.telefon && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.telefon}`} className="hover:underline">
                      {contact.telefon}
                    </a>
                  </div>
                )}
              </div>

              {contact.notes && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Notes</span>
                  <p className="whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Company */}
          {contact.company_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Linked Company
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg mb-4">
                  {companies.find((c) => c.id === contact.company_id)?.firmenname || "Unknown"}
                </p>
                <Button variant="outline" onClick={() => setChangeCompanyDialogOpen(true)}>
                  Change Company
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Primary Contact</span>
                <Badge variant={contact.is_primary ? "default" : "secondary"}>
                  {contact.is_primary ? "Yes" : "No"}
                </Badge>
              </div>

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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Company Dialog */}
      <Dialog open={changeCompanyDialogOpen} onOpenChange={setChangeCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Linked Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companiesQuery.data?.data?.map((company: { id: string; firmenname: string }) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.firmenname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeCompanyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeCompany}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog Placeholder */}
      {editContact && (
        <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Edit form implementation needed
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
