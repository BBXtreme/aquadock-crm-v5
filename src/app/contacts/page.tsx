"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { createContact, deleteContact, getContacts } from "@/lib/supabase/services/contacts";
import type { Contact } from "@/lib/supabase/types";
import { Eye, Edit, Trash, Download, Upload, Columns } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import ContactCreateForm from "@/components/features/ContactCreateForm";
import ContactEditForm from "@/components/features/ContactEditForm";
import ContactsTable from "@/components/tables/ContactsTable";

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
  company_id: z.string().optional(),
  is_primary: z.boolean().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const anredeOptions = [
  { value: "Herr", label: "Herr" },
  { value: "Frau", label: "Frau" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
];

export default function ContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});
  const [editContact, setEditContact] = useState(null);

  const queryClient = useQueryClient();

  const {
    data: contacts = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      return getContacts(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id, createClient()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
    onError: (err) => toast.error("Deletion failed", { description: err.message }),
  });

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} contacts?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteContact(id, createClient())));
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${selectedIds.length} contacts deleted`);
      setRowSelection({});
    } catch (error) {
      toast.error("Bulk delete failed", { description: error.message });
    }
  }, [rowSelection, queryClient]);

  const handleEdit = useCallback((contact) => {
    if (contact) {
      setEditContact(contact);
    }
  }, []);

  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.is_primary).length;
  const companiesWithContacts = new Set(contacts.map((c) => c.company_id)).size;

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Contacts</p>
            <h1 className="font-semibold text-3xl tracking-tight">Contacts</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
              </DialogHeader>
              <ContactCreateForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error.message}</span>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{loading ? <Skeleton className="h-8 w-16" /> : totalContacts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Primary Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{loading ? <Skeleton className="h-8 w-16" /> : primaryContacts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Companies with Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {loading ? <Skeleton className="h-8 w-16" /> : companiesWithContacts}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <SkeletonList count={5} className="space-y-2" itemClassName="h-12 w-full" />
              </div>
            ) : (
              <ContactsTable
                contacts={contacts}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                onEdit={handleEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </CardContent>
        </Card>

        {editContact && (
          <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              <ContactEditForm
                contact={editContact}
                onSuccess={() => {
                  setEditContact(null);
                  queryClient.invalidateQueries({ queryKey: ["contacts"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
