// src/components/tables/TemplatesClient.tsx
// This file defines the TemplatesClient component, handling the interactive parts of the templates management page.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { skeletonCardChrome } from "@/components/ui/page-list-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFormat, useT } from "@/lib/i18n/use-translations";
import { createEmailTemplate, deleteEmailTemplate, getEmailTemplates, updateEmailTemplate } from "@/lib/services/email";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { emailTemplateSchema } from "@/lib/validations/email-template";
import type { EmailTemplate } from "@/types/database.types";

type EmailTemplateForm = z.infer<typeof emailTemplateSchema>;

export default function TemplatesClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const queryClient = useQueryClient();
  const t = useT("massEmail");
  const format = useFormat();

  const form = useForm<EmailTemplateForm>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
    },
  });

  const { data: templates = [], isLoading: templatesLoading, error } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const client = createClient();
      return getEmailTemplates(client);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm) => {
      const client = createClient();
      return createEmailTemplate(data, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(t("toastTemplateCreated"));
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(t("toastTemplateCreateError"), { description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm & { id: string }) => {
      const client = createClient();
      return updateEmailTemplate(data.id, data, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(t("toastTemplateUpdated"));
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(t("toastTemplateUpdateError"), { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = createClient();
      return deleteEmailTemplate(id, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(t("toastTemplateDeleted"));
    },
    onError: (err: Error) => {
      toast.error(t("toastTemplateDeleteError"), { description: err.message });
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
          <h1 className="text-3xl font-bold">{t("templatesTitle")}</h1>
          <p className="text-muted-foreground">{t("templatesPageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/mass-email">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("newTemplate")}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-red-500">{t("templatesLoadError", { message: error.message })}</div>
      ) : null}

      {templatesLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5", "skeleton-6"].map((key) => (
            <Card key={key} className={cn(skeletonCardChrome, "rounded-xl")}>
              <CardHeader>
                <Skeleton className="h-4 w-3/5 max-w-[12rem]" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t("templatesEmpty")}</p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("templatesCreateFirst")}
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
                  {t("templatesUpdated", {
                    date: format.dateTime(new Date(template.updated_at || template.created_at || new Date()), {
                      dateStyle: "medium",
                    }),
                  })}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openPreviewDialog(template)}>
                  <Eye className="mr-1 h-3 w-3" />
                  {t("templatesPreview")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                  <Edit className="mr-1 h-3 w-3" />
                  {t("templatesEdit")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-1 h-3 w-3" />
                      {t("templatesDelete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("templatesDeleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("templatesDeleteDescription", { name: template.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("templateFormCancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                        {t("templatesDelete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("templateFormEditTitle") : t("templateFormCreateTitle")}
            </DialogTitle>
            <DialogDescription>{t("templateFormDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <FormField
                control={form.control as Control<EmailTemplateForm>}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("templateFormNameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("templateFormNamePlaceholder")} />
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
                    <FormLabel>{t("templateFormSubjectLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("templateFormSubjectPlaceholder")} />
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
                    <FormLabel>{t("templateFormBodyLabel")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={8} placeholder={t("templateFormBodyPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("templateFormCancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {t("templateFormSave")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("templatePreviewTitle")}</DialogTitle>
            <DialogDescription>{t("templatePreviewDescription")}</DialogDescription>
          </DialogHeader>
          {previewTemplate ? (
            <div className="space-y-4">
              <div>
                <Label>{t("templatePreviewSubjectLabel")}</Label>
                <div className="font-semibold text-lg border rounded p-2 bg-muted">{previewTemplate.subject}</div>
              </div>
              <div>
                <Label>{t("templatePreviewBodyLabel")}</Label>
                <ScrollArea className="h-64 border rounded p-4 bg-muted">
                  <div className="whitespace-pre-wrap">{previewTemplate.body}</div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
