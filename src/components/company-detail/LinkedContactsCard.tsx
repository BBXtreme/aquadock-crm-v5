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
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/types/database.types";

interface Props {
  companyId: string;
}

export default function LinkedContactsCard({ companyId }: Props) {
  const t = useT("contacts");
  const tCommon = useT("common");
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useSuspenseQuery({
    queryKey: ["contacts", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies!company_id(firmenname)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("nachname", { ascending: true });

      if (error) throw error;

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
              {t("detailLinkedTitle", { count: contacts.length })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createButtonLabel")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState count={5} />}>
            {contacts.length === 0 ? (
              <p className="text-muted-foreground">{t("detailEmptyLinkedCompany")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">{t("tableColName")}</th>
                      <th className="text-left">{t("tableColEmail")}</th>
                      <th className="text-left">{t("tableColPhone")}</th>
                      <th className="text-left">{t("tableColMobile")}</th>
                      <th className="text-left">{t("tableColPrimary")}</th>
                      <th className="text-right w-24">{t("tableColActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => {
                      const displayName =
                        [contact.anrede?.trim(), contact.vorname?.trim(), contact.nachname?.trim()]
                          .filter(Boolean)
                          .join(" ") || tCommon("dash");

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
                              {contact.position && <div className="text-xs text-muted-foreground">{contact.position}</div>}
                            </div>
                          </td>
                          <td>
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">
                                {contact.email}
                              </a>
                            ) : (
                              tCommon("dash")
                            )}
                          </td>
                          <td>{contact.telefon || tCommon("dash")}</td>
                          <td>{contact.mobil || tCommon("dash")}</td>
                          <td>{contact.is_primary && <Badge variant="secondary">{t("tablePrimaryBadge")}</Badge>}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90"
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
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            key={editContact?.id}
            contact={editContact}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
              toast.success(t("detailSavedToast"));
              setEditContact(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            contact={null}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
              toast.success(t("detailSavedToast"));
              setAddDialogOpen(false);
            }}
            preselectedCompanyId={companyId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
