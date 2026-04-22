// src/app/contacts/[id]/ContactDetailClient.tsx
// This file defines the client component for the Contact Detail page, handling all interactive parts.
// It receives the contact and companies data as props and manages state for dialogs and forms.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building, Edit, Linkedin, Trash, Unlink, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";

import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DisplayOrDash, EmptyDash } from "@/components/ui/empty-dash";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WassertypBadge } from "@/components/ui/wassertyp-badge";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { getContactById, updateContact } from "@/lib/actions/contacts";
import { deleteContactWithTrash, restoreContactWithTrash } from "@/lib/actions/crm-trash";
import { anredeOptions } from "@/lib/constants/contact-options";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { getKundentypLabel } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import { type ContactForm, contactSchema } from "@/lib/validations/contact";
import type { Contact } from "@/types/database.types";

interface ContactDetailClientProps {
  contact: Contact;
  companies: { id: string; firmenname: string }[];
}

export default function ContactDetailClient({ contact: initialContact, companies }: ContactDetailClientProps) {
  const t = useT("contacts");
  const tCommon = useT("common");
  const tCompanies = useT("companies");
  const localeTag = useNumberLocaleTag();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [editDialog, setEditDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editCompanyDialog, setEditCompanyDialog] = useState(false);
  const [changeCompanyDialog, setChangeCompanyDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unlinkCompanyDialogOpen, setUnlinkCompanyDialogOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

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
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", contact.company_id)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contact?.company_id,
  });

  const responsibleUserId = contact?.user_id;
  const { data: responsibleProfile } = useQuery({
    queryKey: ["profiles", "by-id", responsibleUserId ?? ""],
    queryFn: async () => {
      const uid = responsibleUserId;
      if (uid == null || uid === "") {
        return null;
      }
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: contact != null && responsibleUserId != null && responsibleUserId !== "",
  });

  const responsibleLine =
    contact != null && responsibleUserId != null && responsibleUserId !== ""
      ? `${tCompanies("responsibleLabel")}: ${safeDisplay(responsibleProfile?.display_name)}`
      : null;

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
    return <div>{t("detailNotFound")}</div>;
  }

  const handleDeleteContact = async () => {
    try {
      const mode = await deleteContactWithTrash(id);
      setDeleteDialogOpen(false);
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreContactWithTrash(id).then(() => {
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
      router.push("/contacts");
    } catch (_error) {
      toast.error(t("tableToastDeleteFailed"));
    }
  };

  const handleUnlinkCompany = async () => {
    if (!contact?.company_id) return;
    const previousCompanyId = contact.company_id;
    setIsUnlinking(true);
    try {
      const supabase = createClient();
      await updateContact(contact.id, { company_id: null }, supabase);
      setUnlinkCompanyDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["contact", id] });
      await queryClient.invalidateQueries({ queryKey: ["company", previousCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["contacts", previousCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("unlinkToastSuccess"), {
        action: {
          label: t("unlinkToastUndo"),
          onClick: () => {
            void updateContact(contact.id, { company_id: previousCompanyId }, createClient())
              .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ["contact", id] });
                await queryClient.invalidateQueries({ queryKey: ["company", previousCompanyId] });
                await queryClient.invalidateQueries({ queryKey: ["contacts", previousCompanyId] });
                await queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
    } catch (err) {
      toast.error(t("unlinkToastFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!contact) return;
    try {
      const supabase = createClient();
      await updateContact(contact.id, { notes: notesValue }, supabase);
      toast.success(t("toastNotesSaved"));
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
    } catch (error) {
      toast.error(t("toastNotesSaveFailed"), {
        description: (error as Error).message,
      });
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/contacts">{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {linkedCompany && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/companies/${linkedCompany.id}`} className="max-w-[32ch] truncate">
                        {linkedCompany.firmenname}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[40ch] truncate">
                  {contact.vorname} {contact.nachname}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {contact.vorname} {contact.nachname}
            </h1>
            {contact.position && <p className="mt-1 text-muted-foreground">{contact.position}</p>}
            {responsibleLine != null ? (
              <p className="mt-1 text-sm text-muted-foreground">{responsibleLine}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditDialog(true)} variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="sm">
                <Trash className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("tableDeleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("tableDeleteConfirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteContact}>{t("delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => router.push("/contacts")} size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Meta + primary toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {contact.created_at && (
            <span suppressHydrationWarning={true}>
              {tCommon("metaCreated")} {new Date(contact.created_at).toLocaleDateString(localeTag)}
            </span>
          )}
          {contact.updated_at && (
            <span suppressHydrationWarning={true}>
              {tCommon("metaUpdated")} {new Date(contact.updated_at).toLocaleDateString(localeTag)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="primary-contact"
            checked={contact.is_primary || false}
            onCheckedChange={async (checked) => {
              const supabase = createClient();
              try {
                await updateContact(contact.id, { is_primary: !!checked }, supabase);
                toast.success(t("toastPrimaryContactSaved"));
                queryClient.invalidateQueries({ queryKey: ["contact", id] });
              } catch (err) {
                toast.error(t("toastPrimaryContactFailed"), { description: (err as Error).message });
              }
            }}
          />
          <label htmlFor="primary-contact" className="text-sm font-medium text-foreground">
            {t("formIsPrimary")}
          </label>
        </div>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("detailSectionContactDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formVorname")}</div>
              <p className="text-sm text-foreground"><DisplayOrDash value={contact.vorname} /></p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formNachname")}</div>
              <p className="text-sm text-foreground"><DisplayOrDash value={contact.nachname} /></p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formSalutation")}</div>
              <p className="text-sm text-foreground"><DisplayOrDash value={contact.anrede} /></p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formPosition")}</div>
              <p className="text-sm text-foreground"><DisplayOrDash value={contact.position} /></p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formEmail")}</div>
              <p className="text-sm text-foreground">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">
                    {contact.email}
                  </a>
                ) : (
                  <EmptyDash />
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formTelefon")}</div>
              <p className="text-sm text-foreground">
                {contact.telefon ? (
                  <a href={`tel:${contact.telefon}`} className="text-primary underline-offset-4 hover:underline">
                    {contact.telefon}
                  </a>
                ) : (
                  <EmptyDash />
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formMobil")}</div>
              <p className="text-sm text-foreground">
                {contact.mobil ? (
                  <a href={`tel:${contact.mobil}`} className="text-primary underline-offset-4 hover:underline">
                    {contact.mobil}
                  </a>
                ) : (
                  <EmptyDash />
                )}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("formDurchwahl")}</div>
              <p className="text-sm text-foreground"><DisplayOrDash value={contact.durchwahl} /></p>
            </div>
            {/* LinkedIn — placeholder, functionality coming in a later iteration.
                Rendered at reduced opacity with a subtle "coming soon" hint so it
                reads as present-but-dormant, in line with the card's tone. */}
            <div aria-disabled="true" className="opacity-60">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>LinkedIn</span>
                <span className="ml-1 text-[10px] font-normal text-muted-foreground/80">
                  · {tCommon("comingSoon")}
                </span>
              </div>
              <p className="text-sm text-foreground cursor-not-allowed select-none">
                <EmptyDash />
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {t("formNotes")}
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
                      {t("detailNotesSave")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(contact.notes || "");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground"><DisplayOrDash value={contact.notes} /></p>
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
            {t("detailSectionLinkedCompany")}
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
                {linkedCompany.status && <StatusBadge status={linkedCompany.status} showEmoji />}
                {linkedCompany.kundentyp && (
                  <Badge className="bg-primary text-primary-foreground">
                    {getKundentypLabel(linkedCompany.kundentyp)}
                  </Badge>
                )}
                <WassertypBadge wassertyp={linkedCompany.wassertyp} />
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
                    className="text-primary underline-offset-4 hover:underline block"
                  >
                    {t("detailOsmLink")}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setChangeCompanyDialog(true)}>
                  {t("detailChangeCompany")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUnlinkCompanyDialogOpen(true)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t("unlinkButtonAria")}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  {t("unlinkConfirmAction")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">{t("detailNoCompanyLinked")}</p>
              <Button variant="outline" size="sm" onClick={() => setChangeCompanyDialog(true)}>
                {t("detailLinkCompany")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
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
            <DialogTitle>{tCompanies("editDialogTitle")}</DialogTitle>
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

      {/* Unlink Company Confirmation */}
      <AlertDialog open={unlinkCompanyDialogOpen} onOpenChange={setUnlinkCompanyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unlinkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unlinkConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkCompany} disabled={isUnlinking}>
              {t("unlinkConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Company Dialog */}
      <Dialog open={changeCompanyDialog} onOpenChange={setChangeCompanyDialog}>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{t("changeLinkedCompanyDialogTitle")}</DialogTitle>
          </DialogHeader>
          <Select
            onValueChange={async (value) => {
              const supabase = createClient();
              try {
                await updateContact(contact.id, { company_id: value === "none" ? null : value }, supabase);
                toast.success(t("toastCompanyLinkUpdated"));
                await queryClient.invalidateQueries({ queryKey: ["contact", id] });
                await queryClient.invalidateQueries({ queryKey: ["company", value === "none" ? null : value] });
                setChangeCompanyDialog(false);
              } catch (err) {
                toast.error(t("toastOperationFailed"), {
                  description: (err as Error).message,
                });
              }
            }}
            defaultValue={contact.company_id || "none"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("formCompanyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("companyUnlinkedOption")}</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.firmenname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WideDialogContent>
      </Dialog>
    </PageShell>
  );
}

function EditContactForm({ contact, onSuccess }: { contact: Contact; onSuccess: () => void }) {
  const t = useT("contacts");
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      vorname: contact.vorname || "",
      nachname: contact.nachname || "",
      anrede: contact.anrede as "Herr" | "Frau" | "Dr." | "Prof." | undefined || undefined,
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
      toast.success(t("toastUpdated"));
      onSuccess();
    } catch (error) {
      toast.error(t("toastContactSaveFailed"), {
        description: (error as Error).message,
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control as Control<ContactForm>}
          name="vorname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formVorname")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="nachname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formNachname")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="anrede"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formSalutation")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formSalutationPlaceholder")} />
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
          control={form.control as Control<ContactForm>}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formPosition")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formEmail")}</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="telefon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formTelefon")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="mobil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formMobil")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="durchwahl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formDurchwahl")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formNotes")}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{t("formIsPrimary")}</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit">{t("formSubmitUpdate")}</Button>
      </form>
    </Form>
  );
}
