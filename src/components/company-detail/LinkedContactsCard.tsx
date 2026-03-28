"use client";
import { useQuery } from "@tanstack/react-query";
import { Edit, Plus, Trash, User } from "lucide-react";
import { useState } from "react";
import ContactEditForm from "@/components/features/ContactEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/lib/supabase/database.types";

interface Props {
  companyId: string;
}

export default function LinkedContactsCard({ companyId }: Props) {
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  console.log("LinkedContactsCard companyId:", companyId);

  const {
    data: contacts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contacts", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies!company_id(firmenname)")
        .eq("company_id", companyId)
        .order("nachname", { ascending: true });

      if (error) throw error;

      console.log("🔍 LinkedContactsCard - RAW data from Supabase for company", companyId);
      console.table(data);
      if (data && data.length > 0) {
        console.log("📋 First contact full object:", data[0]);
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const handleAdd = () => setAddDialogOpen(true);
  const handleEdit = (contact: Contact) => setEditContact(contact);
  const handleDelete = (id: string) => console.log("Delete contact", id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Linked Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">Loading contacts...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Linked Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error loading contacts: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Linked Contacts ({contacts.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add Contact
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
                  <th className="text-left">Email</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Mobil</th>
                  <th className="text-left">Primary</th>
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                  const displayName =
                    [contact.anrede?.trim(), contact.vorname?.trim(), contact.nachname?.trim()]
                      .filter(Boolean)
                      .join(" ") || "—";

                  return (
                    <tr key={contact.id}>
                      <td>
                        <div>
                          {contact.id ? (
                            <a href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                              {displayName}
                            </a>
                          ) : (
                            <span>{displayName}</span>
                          )}
                          {contact.position && <div className="text-xs text-gray-500">{contact.position}</div>}
                        </div>
                      </td>
                      <td>
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                            {contact.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{contact.telefon || "—"}</td>
                      <td>{contact.mobil || "—"}</td>
                      <td>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(contact.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm key={editContact?.id} contact={editContact} onSuccess={() => setEditContact(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm contact={null} onSuccess={() => setAddDialogOpen(false)} preselectedCompanyId={companyId} />
        </DialogContent>
      </Dialog>
    </>
  );
}
