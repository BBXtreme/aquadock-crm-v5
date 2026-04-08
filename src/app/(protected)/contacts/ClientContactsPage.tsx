"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import ContactCreateForm from "@/components/features/contacts/ContactCreateForm";
import ContactEditForm from "@/components/features/contacts/ContactEditForm";
import ContactsTable from "@/components/tables/ContactsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/ui/StatCard";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { getContacts } from "@/lib/actions/contacts";
import { deleteContactWithTrash, restoreContactWithTrash } from "@/lib/actions/crm-trash";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/types/database.types";

type ContactWithCompany = Contact & { companies?: { firmenname: string } | null };

function ClientContactsPage() {
  const t = useT("contacts");
  const router = useRouter();
  const localeTag = useNumberLocaleTag();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [_columnVisibility, _setColumnVisibility] = useState({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "nachname", desc: false }]);

  const queryClient = useQueryClient();

  const sortId = sorting[0]?.id ?? "nachname";
  const sortDesc = sorting[0]?.desc ?? false;

  const contactsData = useSuspenseQuery({
    queryKey: ["contacts", pagination.pageIndex, pagination.pageSize, sortId, sortDesc],
    queryFn: async () => {
      const supabase = createClient();
      return getContacts(supabase, {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sortBy: sortId,
        sortDesc,
      });
    },
  });

  const contacts = contactsData.data.data;
  const total = contactsData.data.total;
  const pageCount = Math.ceil(total / pagination.pageSize);

  const statsData = useSuspenseQuery({
    queryKey: ["contacts-stats"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const [totalRes, primaryRes, companiesRes] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("is_primary", true),
        supabase
          .from("companies")
          .select("id, contacts!inner(id)", { count: "exact", head: true })
          .is("deleted_at", null),
      ]);

      const total = totalRes.count ?? 0;
      const primary = primaryRes.count ?? 0;
      const companiesWithContacts = companiesRes.error ? 0 : (companiesRes.count ?? 0);

      return { total, primary, companiesWithContacts };
    },
  });

  const totalContacts = statsData.data.total;
  const primaryContacts = statsData.data.primary;
  const companiesWithContacts = statsData.data.companiesWithContacts;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContactWithTrash(id),
    onMutate: async (id) => {
      const queryKey = ["contacts", pagination.pageIndex, pagination.pageSize, sortId, sortDesc];
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
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
    },
    onSuccess: (mode, id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-stats"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreContactWithTrash(id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["contacts"] });
                queryClient.invalidateQueries({ queryKey: ["contacts-stats"] });
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

  const _handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;
    if (!confirm(t("confirmBulkDelete", { count: selectedIds.length }))) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteContactWithTrash(id)));
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("toastBulkDeleted", { count: selectedIds.length }));
      setRowSelection({});
    } catch (error) {
      toast.error(t("toastBulkDeleteFailed"), { description: (error as Error).message });
    }
  }, [rowSelection, queryClient, t]);

  const handleEdit = useCallback((contact: Contact | null) => {
    if (contact) {
      setEditContact(contact);
    }
  }, []);

  const searchParams = useSearchParams();
  const createIntent = searchParams.get("create");
  const trashedContactRedirect = searchParams.get("trashedContact") === "1";

  useEffect(() => {
    if (createIntent === "true") {
      setDialogOpen(true);
    }
  }, [createIntent]);

  useEffect(() => {
    if (!trashedContactRedirect) {
      return;
    }
    toast.message(t("toastTrashedContact"));
    router.replace("/contacts", { scroll: false });
  }, [trashedContactRedirect, router, t]);

  return (
    <>
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("newContact")}</Button>
          </DialogTrigger>
          <WideDialogContent size="2xl">
            <DialogHeader>
              <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            </DialogHeader>
            <ContactCreateForm onSuccess={() => setDialogOpen(false)} />
          </WideDialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title={t("statTotal")}
          value={totalContacts.toLocaleString(localeTag)}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={t("statTrendContacts")}
        />
        <StatCard
          title={t("statPrimary")}
          value={primaryContacts.toLocaleString(localeTag)}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={t("statTrendPrimary")}
        />
        <StatCard
          title={t("statCompanies")}
          value={companiesWithContacts.toLocaleString(localeTag)}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={t("statTrendCompanies")}
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

      {editContact && (
        <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
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
