// This component renders a list of contacts linked to a specific company. It allows users to view, add, edit, and delete contacts. Each contact can be associated with a company and includes details like name, email, phone, and position. The component uses React Query for data fetching and mutations, and Supabase as the backend database. It also includes loading states and error handling with toast notifications.  - source:
"use client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Edit, Plus, Trash, Unlink, User } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import ContactEditForm from "@/components/features/contacts/ContactEditForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactAvatar } from "@/components/ui/contact-avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyDash } from "@/components/ui/empty-dash";
import { LoadingState } from "@/components/ui/LoadingState";
import { deleteContactWithTrash, restoreContactWithTrash } from "@/lib/actions/crm-trash";
import type { OwnerScopedEditViewer } from "@/lib/auth/owner-scoped-edit-permission";
import { canEditContactRecord } from "@/lib/contacts/contact-edit-permission";
import { useT } from "@/lib/i18n/use-translations";
import { companyKeys, contactKeys } from "@/lib/query/keys";
import { updateContact } from "@/lib/services/contacts";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/types/database.types";

interface Props {
  companyId: string;
  editPermissionViewer: OwnerScopedEditViewer;
  /** Company-level write (owner/admin); gates add-contact on this company */
  canManageContacts: boolean;
}

export default function LinkedContactsCard({
  companyId,
  editPermissionViewer,
  canManageContacts,
}: Props) {
  const t = useT("contacts");
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [contactToUnlink, setContactToUnlink] = useState<Contact | null>(null);
  const queryClient = useQueryClient();

  // Phase 2 §4.3 — factory keys eliminate the `["contacts", id]` collision
  // with `CompanyKpiCards`. `contactKeys.byCompany(id)` is the richer
  // projection used here; KPI cards use `contactKeys.kpi(id)`.
  const invalidateContactQueries = (previousCompanyId: string | null) => {
    queryClient.invalidateQueries({ queryKey: contactKeys.byCompany(companyId) });
    queryClient.invalidateQueries({ queryKey: contactKeys.kpi(companyId) });
    queryClient.invalidateQueries({ queryKey: contactKeys.all });
    queryClient.invalidateQueries({ queryKey: contactKeys.stats() });
    queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    if (previousCompanyId && previousCompanyId !== companyId) {
      queryClient.invalidateQueries({ queryKey: contactKeys.byCompany(previousCompanyId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.kpi(previousCompanyId) });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(previousCompanyId) });
    }
  };

  const { data: contacts = [] } = useSuspenseQuery({
    queryKey: contactKeys.byCompany(companyId),
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContactWithTrash(id),
    onMutate: async (id) => {
      const queryKey = contactKeys.byCompany(companyId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Contact[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Contact[]>(
          queryKey,
          previous.filter((c) => c.id !== id),
        );
      }
      return { previous, queryKey };
    },
    onError: (err, _id, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error(t("tableToastDeleteFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    },
    onSuccess: (mode, id) => {
      invalidateContactQueries(null);
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreContactWithTrash(id).then(() => {
                invalidateContactQueries(null);
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (contact: Contact) => updateContact(contact.id, { company_id: null }),
    onMutate: async (contact) => {
      const queryKey = contactKeys.byCompany(companyId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Contact[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Contact[]>(
          queryKey,
          previous.filter((c) => c.id !== contact.id),
        );
      }
      return { previous, queryKey, previousCompanyId: contact.company_id };
    },
    onError: (err, _contact, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error(t("unlinkToastFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    },
    onSuccess: (_data, contact, context) => {
      invalidateContactQueries(context?.previousCompanyId ?? null);
      toast.success(t("unlinkToastSuccess"), {
        action: {
          label: t("unlinkToastUndo"),
          onClick: () => {
            void updateContact(contact.id, { company_id: companyId })
              .then(() => {
                invalidateContactQueries(null);
                toast.success(t("unlinkToastUndone"));
              })
              .catch((err: unknown) => {
                toast.error(t("unlinkToastFailed"), {
                  description: err instanceof Error ? err.message : undefined,
                });
              });
          },
        },
      });
    },
  });

  const handleAdd = () => setAddDialogOpen(true);
  const handleEdit = (contact: Contact) => setEditContact(contact);
  const handleDeleteRequest = (contact: Contact) => setContactToDelete(contact);
  const handleDeleteConfirm = () => {
    if (!contactToDelete) return;
    deleteMutation.mutate(contactToDelete.id);
    setContactToDelete(null);
  };
  const handleUnlinkRequest = (contact: Contact) => setContactToUnlink(contact);
  const handleUnlinkConfirm = () => {
    if (!contactToUnlink) return;
    unlinkMutation.mutate(contactToUnlink);
    setContactToUnlink(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("detailLinkedTitle", { count: contacts.length })}
            </CardTitle>
            {canManageContacts ? (
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createButtonLabel")}
              </Button>
            ) : null}
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
                      const canEditContact = canEditContactRecord(contact, editPermissionViewer);
                      const nameParts = [contact.anrede?.trim(), contact.vorname?.trim(), contact.nachname?.trim()]
                        .filter(Boolean)
                        .join(" ");
                      const displayName = nameParts ? nameParts : <EmptyDash />;

                      return (
                        <tr key={contact.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <ContactAvatar vorname={contact.vorname} nachname={contact.nachname} />
                              <div className="min-w-0">
                                {contact.id ? (
                                  <a href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                                    {displayName}
                                  </a>
                                ) : (
                                  <span>{displayName}</span>
                                )}
                                {contact.position && (
                                  <div className="text-xs text-muted-foreground">{contact.position}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">
                                {contact.email}
                              </a>
                            ) : (
                              <EmptyDash />
                            )}
                          </td>
                          <td>{contact.telefon || <EmptyDash />}</td>
                          <td>{contact.mobil || <EmptyDash />}</td>
                          <td>{contact.is_primary && <Badge variant="secondary">{t("tablePrimaryBadge")}</Badge>}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEditContact ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(contact)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              ) : null}
                              {canEditContact ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleUnlinkRequest(contact)}
                                disabled={unlinkMutation.isPending}
                                aria-label={t("unlinkButtonAria")}
                                title={t("unlinkButtonAria")}
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                              ) : null}
                              {canEditContact ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90"
                                onClick={() => handleDeleteRequest(contact)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                              ) : null}
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
            onCancel={() => setEditContact(null)}
            onSuccess={() => {
              invalidateContactQueries(null);
              toast.success(t("detailSavedToast"));
              setEditContact(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!contactToDelete}
        onOpenChange={(open) => {
          if (!open) setContactToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tableDeleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("tableDeleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!contactToUnlink}
        onOpenChange={(open) => {
          if (!open) setContactToUnlink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unlinkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unlinkConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkConfirm}>{t("unlinkConfirmAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          </DialogHeader>
          <ContactEditForm
            contact={null}
            preselectedCompanyId={companyId}
            onCancel={() => setAddDialogOpen(false)}
            onSuccess={() => {
              invalidateContactQueries(null);
              toast.success(t("detailSavedToast"));
              setAddDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
