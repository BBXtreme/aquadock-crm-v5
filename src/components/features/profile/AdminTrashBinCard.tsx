"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  type Table as TanStackTable,
  useReactTable,
} from "@tanstack/react-table";
import { ArchiveRestore, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  bulkHardDeleteCompanies,
  bulkHardDeleteContacts,
  bulkHardDeleteReminders,
  bulkHardDeleteTimelineEntries,
  bulkRestoreCompanies,
  bulkRestoreContacts,
  bulkRestoreReminders,
  bulkRestoreTimelineEntries,
} from "@/lib/actions/crm-trash";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { fetchTrashBinPreference, TRASH_BIN_DEFAULT_ENABLED } from "@/lib/services/user-settings";
import { createClient } from "@/lib/supabase/browser";
import { safeDisplay } from "@/lib/utils/data-format";

/** Stable fallback so column useMemo does not see a new `{}` every render while trashRows is loading. */
const EMPTY_TRASH_PROFILE_NAMES: Record<string, string> = {};

type TrashedCompany = {
  id: string;
  firmenname: string;
  deleted_at: string | null;
  deleted_by: string | null;
};
type TrashedContact = {
  id: string;
  vorname: string;
  nachname: string;
  deleted_at: string | null;
  deleted_by: string | null;
};
type TrashedReminder = { id: string; title: string; deleted_at: string | null; deleted_by: string | null };
type TrashedTimeline = { id: string; title: string; deleted_at: string | null; deleted_by: string | null };

type TrashRowsPayload = {
  profileDisplayByUserId: Record<string, string>;
  companies: TrashedCompany[];
  contacts: TrashedContact[];
  reminders: TrashedReminder[];
  timeline: TrashedTimeline[];
};

type TrashTab = "companies" | "contacts" | "reminders" | "timeline";

function formatDateTimeLocale(iso: string | null | undefined, localeTag: string): string {
  if (iso === null || iso === undefined || iso === "") {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminTrashBinCard() {
  const t = useT("profile");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TrashTab>("companies");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data: trashPref, isLoading: prefLoading } = useQuery({
    queryKey: ["trash-bin-preference"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { trashBinEnabled: TRASH_BIN_DEFAULT_ENABLED };
      }
      return fetchTrashBinPreference(supabase, user.id);
    },
  });

  const trashEnabled = trashPref?.trashBinEnabled ?? TRASH_BIN_DEFAULT_ENABLED;

  const { data: trashRows, isLoading: rowsLoading } = useQuery({
    queryKey: ["admin-trash-rows"],
    enabled: trashEnabled,
    queryFn: async (): Promise<TrashRowsPayload> => {
      const supabase = createClient();
      const [c, co, r, tl] = await Promise.all([
        supabase
          .from("companies")
          .select("id, firmenname, deleted_at, deleted_by")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
        supabase
          .from("contacts")
          .select("id, vorname, nachname, deleted_at, deleted_by")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
        supabase
          .from("reminders")
          .select("id, title, deleted_at, deleted_by")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
        supabase
          .from("timeline")
          .select("id, title, deleted_at, deleted_by")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (co.error) throw co.error;
      if (r.error) throw r.error;
      if (tl.error) throw tl.error;

      const companies = (c.data ?? []) as TrashedCompany[];
      const contacts = (co.data ?? []) as TrashedContact[];
      const reminders = (r.data ?? []) as TrashedReminder[];
      const timeline = (tl.data ?? []) as TrashedTimeline[];

      const deleterIds = new Set<string>();
      for (const row of [...companies, ...contacts, ...reminders, ...timeline]) {
        if (row.deleted_by !== null && row.deleted_by !== undefined && row.deleted_by !== "") {
          deleterIds.add(row.deleted_by);
        }
      }

      const profileDisplayByUserId: Record<string, string> = {};
      const idList = Array.from(deleterIds);
      if (idList.length > 0) {
        const { data: profs, error: pe } = await supabase.from("profiles").select("id, display_name").in("id", idList);
        if (pe) throw pe;
        for (const p of profs ?? []) {
          const dn = p.display_name;
          if (dn !== null && dn !== undefined && String(dn).trim() !== "") {
            profileDisplayByUserId[p.id] = String(dn);
          }
        }
      }

      return {
        profileDisplayByUserId,
        companies,
        contacts,
        reminders,
        timeline,
      };
    },
  });

  const invalidateTrash = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-trash-rows"] });
    void queryClient.invalidateQueries({ queryKey: ["companies"] });
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    void queryClient.invalidateQueries({ queryKey: ["timeline"] });
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async (payload: { kind: TrashTab; ids: string[] }) => {
      const { kind, ids } = payload;
      if (ids.length === 0) return;
      if (kind === "companies") await bulkRestoreCompanies(ids);
      else if (kind === "contacts") await bulkRestoreContacts(ids);
      else if (kind === "reminders") await bulkRestoreReminders(ids);
      else await bulkRestoreTimelineEntries(ids);
    },
    onSuccess: () => {
      invalidateTrash();
      setRowSelection({});
      toast.success(t("trashToastRestored"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("trashActionError");
      toast.error(t("trashActionError"), { description: message });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (payload: { kind: TrashTab; ids: string[] }) => {
      const { kind, ids } = payload;
      if (ids.length === 0) return;
      if (kind === "companies") await bulkHardDeleteCompanies(ids);
      else if (kind === "contacts") await bulkHardDeleteContacts(ids);
      else if (kind === "reminders") await bulkHardDeleteReminders(ids);
      else await bulkHardDeleteTimelineEntries(ids);
    },
    onSuccess: () => {
      invalidateTrash();
      setRowSelection({});
      toast.success(t("trashToastHardDeleted"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("trashActionError");
      toast.error(t("trashActionError"), { description: message });
    },
  });

  const companies = trashRows?.companies ?? [];
  const contacts = trashRows?.contacts ?? [];
  const reminders = trashRows?.reminders ?? [];
  const timelineRows = trashRows?.timeline ?? [];
  const profileDisplayByUserId = trashRows?.profileDisplayByUserId ?? EMPTY_TRASH_PROFILE_NAMES;

  const companyColumns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
              aria-label="Alle auswählen"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              aria-label="Zeile auswählen"
            />
          ),
        },
        { accessorKey: "firmenname", header: t("trashColName"), cell: (info) => safeDisplay(String(info.getValue())) },
        {
          accessorKey: "deleted_at",
          header: t("trashColDeleted"),
          cell: (info) => (
            <span className="tabular-nums text-muted-foreground">
              {formatDateTimeLocale(info.getValue() as string | null, localeTag)}
            </span>
          ),
        },
        {
          id: "deleted_by",
          header: t("trashColDeletedBy"),
          cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;
            const unknownLabel = t("trashDeleterUnknown");
            if (deletedBy === null || deletedBy === undefined || deletedBy === "") {
              return safeDisplay(null, unknownLabel);
            }
            const raw = profileDisplayByUserId[deletedBy];
            if (raw === undefined || raw.trim() === "") {
              return safeDisplay(null, unknownLabel);
            }
            return safeDisplay(raw);
          },
        },
      ] satisfies ColumnDef<TrashedCompany>[],
    [t, profileDisplayByUserId, localeTag],
  );

  const contactColumns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
              aria-label="Alle auswählen"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              aria-label="Zeile auswählen"
            />
          ),
        },
        {
          id: "name",
          header: t("trashColName"),
          cell: ({ row }) => safeDisplay(`${row.original.vorname} ${row.original.nachname}`.trim()),
        },
        {
          accessorKey: "deleted_at",
          header: t("trashColDeleted"),
          cell: (info) => (
            <span className="tabular-nums text-muted-foreground">
              {formatDateTimeLocale(info.getValue() as string | null, localeTag)}
            </span>
          ),
        },
        {
          id: "deleted_by",
          header: t("trashColDeletedBy"),
          cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;
            const unknownLabel = t("trashDeleterUnknown");
            if (deletedBy === null || deletedBy === undefined || deletedBy === "") {
              return safeDisplay(null, unknownLabel);
            }
            const raw = profileDisplayByUserId[deletedBy];
            if (raw === undefined || raw.trim() === "") {
              return safeDisplay(null, unknownLabel);
            }
            return safeDisplay(raw);
          },
        },
      ] satisfies ColumnDef<TrashedContact>[],
    [t, profileDisplayByUserId, localeTag],
  );

  const reminderColumns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
              aria-label="Alle auswählen"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              aria-label="Zeile auswählen"
            />
          ),
        },
        { accessorKey: "title", header: t("trashColName"), cell: (info) => safeDisplay(String(info.getValue())) },
        {
          accessorKey: "deleted_at",
          header: t("trashColDeleted"),
          cell: (info) => (
            <span className="tabular-nums text-muted-foreground">
              {formatDateTimeLocale(info.getValue() as string | null, localeTag)}
            </span>
          ),
        },
        {
          id: "deleted_by",
          header: t("trashColDeletedBy"),
          cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;
            const unknownLabel = t("trashDeleterUnknown");
            if (deletedBy === null || deletedBy === undefined || deletedBy === "") {
              return safeDisplay(null, unknownLabel);
            }
            const raw = profileDisplayByUserId[deletedBy];
            if (raw === undefined || raw.trim() === "") {
              return safeDisplay(null, unknownLabel);
            }
            return safeDisplay(raw);
          },
        },
      ] satisfies ColumnDef<TrashedReminder>[],
    [t, profileDisplayByUserId, localeTag],
  );

  const timelineColumns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
              aria-label="Alle auswählen"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              aria-label="Zeile auswählen"
            />
          ),
        },
        { accessorKey: "title", header: t("trashColName"), cell: (info) => safeDisplay(String(info.getValue())) },
        {
          accessorKey: "deleted_at",
          header: t("trashColDeleted"),
          cell: (info) => (
            <span className="tabular-nums text-muted-foreground">
              {formatDateTimeLocale(info.getValue() as string | null, localeTag)}
            </span>
          ),
        },
        {
          id: "deleted_by",
          header: t("trashColDeletedBy"),
          cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;
            const unknownLabel = t("trashDeleterUnknown");
            if (deletedBy === null || deletedBy === undefined || deletedBy === "") {
              return safeDisplay(null, unknownLabel);
            }
            const raw = profileDisplayByUserId[deletedBy];
            if (raw === undefined || raw.trim() === "") {
              return safeDisplay(null, unknownLabel);
            }
            return safeDisplay(raw);
          },
        },
      ] satisfies ColumnDef<TrashedTimeline>[],
    [t, profileDisplayByUserId, localeTag],
  );

  const tableCompanies = useReactTable({
    data: companies,
    columns: companyColumns,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableContacts = useReactTable({
    data: contacts,
    columns: contactColumns,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableReminders = useReactTable({
    data: reminders,
    columns: reminderColumns,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableTimeline = useReactTable({
    data: timelineRows,
    columns: timelineColumns,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const activeTable =
    tab === "companies"
      ? tableCompanies
      : tab === "contacts"
        ? tableContacts
        : tab === "reminders"
          ? tableReminders
          : tableTimeline;

  const selectedIds = activeTable.getFilteredSelectedRowModel().rows.map((r) => r.original.id);
  const selectedCount = selectedIds.length;

  const isLoading = prefLoading || (trashEnabled && rowsLoading);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ArchiveRestore className="h-6 w-6 text-primary" />
          {t("trashBinTitle")}
        </CardTitle>
        <CardDescription>{trashEnabled ? null : t("trashBinDisabled")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-10 w-full" key="trash-skeleton-toolbar" />
            <Skeleton className="h-48 w-full" key="trash-skeleton-table" />
          </div>
        ) : null}

        {!isLoading && trashEnabled ? (
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setRowSelection({});
              setTab(v as TrashTab);
            }}
            className="w-full gap-4"
          >
            <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 sm:w-auto sm:flex-nowrap">
              <TabsTrigger value="companies" type="button">
                {t("trashTabCompanies")} ({companies.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" type="button">
                {t("trashTabContacts")} ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="reminders" type="button">
                {t("trashTabReminders")} ({reminders.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" type="button">
                {t("trashTabTimeline")} ({timelineRows.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={selectedCount === 0 || restoreMutation.isPending}
                onClick={() => restoreMutation.mutate({ kind: tab, ids: selectedIds })}
              >
                {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("trashRestore")}
                {selectedCount > 0 ? ` (${selectedCount})` : ""}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={selectedCount === 0}>
                    {t("trashHardDelete")}
                    {selectedCount > 0 ? ` (${selectedCount})` : ""}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("trashHardDelete")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("trashConfirmHard")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      disabled={hardDeleteMutation.isPending}
                      onClick={() => hardDeleteMutation.mutate({ kind: tab, ids: selectedIds })}
                    >
                      {t("trashHardDelete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <TabsContent value="companies" className="mt-0 w-full min-w-0">
              <TrashTableBody table={tableCompanies} emptyLabel={t("trashEmpty")} />
            </TabsContent>
            <TabsContent value="contacts" className="mt-0 w-full min-w-0">
              <TrashTableBody table={tableContacts} emptyLabel={t("trashEmpty")} />
            </TabsContent>
            <TabsContent value="reminders" className="mt-0 w-full min-w-0">
              <TrashTableBody table={tableReminders} emptyLabel={t("trashEmpty")} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0 w-full min-w-0">
              <TrashTableBody table={tableTimeline} emptyLabel={t("trashEmpty")} />
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TrashTableBody<TData>({ table, emptyLabel }: { table: TanStackTable<TData>; emptyLabel: string }) {
  const rows = table.getRowModel().rows;
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm py-6 text-center">{emptyLabel}</p>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
