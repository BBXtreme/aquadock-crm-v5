// This component renders a list of contacts linked to a specific company. It allows users to view, add, edit, and delete contacts. Each contact can be associated with a company and includes details like name, email, phone, and position. The component uses React Query for data fetching and mutations, and Supabase as the backend database. It also includes loading states and error handling with toast notifications.  - source:
"use client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Edit, Plus, Trash, User } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import ContactEditForm from "@/components/features/contacts/ContactEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/types/database.types";

interface Props {
  companyId: string;
}

export default function LinkedContactsCard({ companyId }: Props) {
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  console.log("LinkedContactsCard companyId:", companyId);

  const { data: contacts = [] } = useSuspenseQuery({
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
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const handleAdd = () => setAddDialogOpen(true);
  const handleEdit = (contact: Contact) => setEditContact(contact);
  const handleDelete = (id: string) => console.log("Delete contact", id);

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
          <Suspense fallback={<LoadingState count={5} />}>
            {contacts.length === 0 ? (
              <p className="text-gray-500">No contacts linked to this company.</p>
            ) : (
              <div className="overflow-x-auto">
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
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>

      <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            key={editContact?.id}
            contact={editContact}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
              toast.success("Contact saved");
              setEditContact(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            contact={null}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
              toast.success("Contact saved");
              setAddDialogOpen(false);
            }}
            preselectedCompanyId={companyId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
