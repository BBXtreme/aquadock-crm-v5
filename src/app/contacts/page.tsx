"use client";

import { useCallback, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import ContactCreateForm from "@/components/features/ContactCreateForm";
import ContactEditForm from "@/components/features/ContactEditForm";
import ContactsTable from "@/components/tables/ContactsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { deleteContact, getContacts } from "@/lib/supabase/services/contacts";
import { cn } from "@/lib/utils";

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

const _anredeOptions = [
  { value: "Herr", label: "Herr" },
  { value: "Frau", label: "Frau" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
];

export default function ContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [_columnVisibility, _setColumnVisibility] = useState({ anrede: false });
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

  const _handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} contacts?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteContact(id, createClient())));
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
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Contacts</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Contacts
          </h1>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Contacts"
          value={loading ? <Skeleton className="h-8 w-20" /> : totalContacts.toLocaleString("de-DE")}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+8% from last month"
        />
        <StatCard
          title="Primary Contacts"
          value={loading ? <Skeleton className="h-8 w-20" /> : primaryContacts.toLocaleString("de-DE")}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+5% from last month"
        />
        <StatCard
          title="Companies with Contacts"
          value={loading ? <Skeleton className="h-8 w-20" /> : companiesWithContacts.toLocaleString("de-DE")}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+12% from last month"
        />
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
  );
}

// StatCard component
function StatCard({ title, value, icon, className, change }: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
  change?: string;
}) {
  return (
    <Card className={cn("bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50", className)}>
      <div className="hover:brightness-105 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="rounded-full bg-muted/50 p-3 flex items-center justify-center">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {change && <p className="text-xs text-green-600">{change}</p>}
        </CardContent>
      </div>
    </Card>
  );
}
