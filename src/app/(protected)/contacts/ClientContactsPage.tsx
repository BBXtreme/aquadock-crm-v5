"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building, Users } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { toast } from "sonner";

import ContactCreateForm from "@/components/features/contacts/ContactCreateForm";
import ContactEditForm from "@/components/features/contacts/ContactEditForm";
import ContactsTable from "@/components/tables/ContactsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser-client";
import type { Contact } from "@/lib/supabase/database.types";
import { deleteContact, getContacts } from "@/lib/supabase/services/contacts";

type ContactWithCompany = Contact & { companies?: { firmenname: string } | null };

function ClientContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [_columnVisibility, _setColumnVisibility] = useState({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "nachname", desc: false }]);

  const queryClient = useQueryClient();

  const contactsData = useSuspenseQuery({
    queryKey: ["contacts", pagination.pageIndex, pagination.pageSize, sorting],
    queryFn: async () => {
      const supabase = createClient();
      return getContacts(supabase, {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sortBy: sorting[0]?.id,
        sortDesc: sorting[0]?.desc,
      });
    },
  });

  const contacts = contactsData.data.data;
  const total = contactsData.data.total;
  const pageCount = Math.ceil(total / pagination.pageSize);

  const statsData = useSuspenseQuery({
    queryKey: ["contacts-stats"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("contacts").select("is_primary, company_id");
      const total = data?.length || 0;
      const primary = data?.filter((c) => c.is_primary).length || 0;
      const companiesWithContacts = new Set(data?.map((c) => c.company_id)).size;
      return { total, primary, companiesWithContacts };
    },
  });

  const totalContacts = statsData.data.total;
  const primaryContacts = statsData.data.primary;
  const companiesWithContacts = statsData.data.companiesWithContacts;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id, createClient()),
    onMutate: async (id) => {
      const queryKey = ["contacts", pagination.pageIndex, pagination.pageSize, sorting];
      await queryClient.cancelQueries({ queryKey });
      const previousContacts = queryClient.getQueryData<{ data: ContactWithCompany[]; total: number }>(queryKey);
      if (previousContacts) {
        queryClient.setQueryData(queryKey, {
          data: previousContacts.data.filter((contact) => contact.id !== id),
          total: previousContacts.total - 1,
        });
      }
      return { previousContacts, queryKey };
    },
    onError: (err, _id, context) => {
      if (context?.previousContacts && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousContacts);
      }
      toast.error("Deletion failed", { description: (err as Error).message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
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
      toast.error("Bulk delete failed", { description: (error as Error).message });
    }
  }, [rowSelection, queryClient]);

  const handleEdit = useCallback((contact: Contact | null) => {
    if (contact) {
      setEditContact(contact);
    }
  }, []);

  return (
    <>
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
          <WideDialogContent size="2xl">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
            </DialogHeader>
            <ContactCreateForm onSuccess={() => setDialogOpen(false)} />
          </WideDialogContent>
        </Dialog>
      </div>

      <Suspense fallback={<LoadingState count={8} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="Total Contacts"
            value={totalContacts.toLocaleString("de-DE")}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change="+8% from last month"
          />
          <StatCard
            title="Primary Contacts"
            value={primaryContacts.toLocaleString("de-DE")}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change="+5% from last month"
          />
          <StatCard
            title="Companies with Contacts"
            value={companiesWithContacts.toLocaleString("de-DE")}
            icon={<Building className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change="+12% from last month"
          />
        </div>

        <Card>
          <CardContent>
            <ContactsTable
              contacts={contacts}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              pageCount={pageCount}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          </CardContent>
        </Card>
      </Suspense>

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
    </>
  );
}

export default ClientContactsPage;
