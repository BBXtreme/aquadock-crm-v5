// src/components/tables/TemplatesClient.tsx
// This file defines the TemplatesClient component, handling the interactive parts of the templates management page.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Control } from "react-hook-form";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { createEmailTemplate, deleteEmailTemplate, getEmailTemplates, updateEmailTemplate } from "@/lib/services/email";
import { createClient } from "@/lib/supabase/browser";
import { emailTemplateFormSchema, type EmailTemplateForm } from "@/lib/validations/email-template";
import type { EmailTemplate } from "@/types/database.types";

export default function TemplatesClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const queryClient = useQueryClient();

  const form = useForm<EmailTemplateForm>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
    },
  });

  // Templates
  const { data: templates = [], isLoading: templatesLoading, error } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const client = createClient();
      return getEmailTemplates(client);
    },
  });

  // Mutations for templates
  const createMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm) => {
      const client = createClient();
      return createEmailTemplate(data, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage erstellt");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Erstellen", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm & { id: string }) => {
      const client = createClient();
      return updateEmailTemplate(data.id, data, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage aktualisiert");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Aktualisieren", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = createClient();
      return deleteEmailTemplate(id, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage gelöscht");
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Löschen", { description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    form.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setDialogOpen(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleSaveTemplate = form.handleSubmit((data) => {
    if (editingTemplate) {
      updateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createMutation.mutate(data);
    }
  });

  const handleDeleteTemplate = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-Mail Vorlagen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre E-Mail-Vorlagen</p>
        </div>
        <div className="flex gap-2">
          <Link href="/mass-email">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Vorlage
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-500">Fehler beim Laden der Vorlagen: {error.message}</div>
      )}

      {templatesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5", "skeleton-6"].map((key) => (
            <Card key={key} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </CardContent>
              <CardFooter>
                <div className="h-8 bg-muted rounded w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Noch keine Vorlagen vorhanden.</p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Erste Vorlage erstellen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Aktualisiert: {new Date(template.updated_at || template.created_at || new Date()).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openPreviewDialog(template)}>
                  <Eye className="mr-1 h-3 w-3" />
                  Vorschau
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Bearbeiten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-1 h-3 w-3" />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Die Vorlage "{template.name}" wird dauerhaft gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Löschen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</DialogTitle>
            <DialogDescription>
              Erstellen oder bearbeiten Sie eine E-Mail-Vorlage mit Platzhaltern für personalisierte Nachrichten.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <FormField
                control={form.control as Control<EmailTemplateForm>}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="z.B. Einführung E-Mail" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as Control<EmailTemplateForm>}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betreff *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="z.B. Willkommen bei AquaDock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as Control<EmailTemplateForm>}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inhalt</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={8}
                        placeholder={`Hallo {{vorname}},

wir freuen uns, Sie als {{firmenname}} begrüßen zu dürfen.

Verfügbare Platzhalter: {{vorname}}, {{nachname}}, {{firmenname}}, {{anrede}}, {{name}}, {{stadt}}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  Speichern
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vorlagen-Vorschau</DialogTitle>
            <DialogDescription>
              Vorschau der E-Mail-Vorlage mit Platzhaltern.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Betreff</Label>
                <div className="font-semibold text-lg border rounded p-2 bg-muted">{previewTemplate.subject}</div>
              </div>
              <div>
                <Label>Inhalt</Label>
                <ScrollArea className="h-64 border rounded p-4 bg-muted">
                  <div className="whitespace-pre-wrap">{previewTemplate.body}</div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
