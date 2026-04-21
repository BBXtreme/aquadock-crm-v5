// src/components/tables/TimelineTable.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper, type PaginationState } from "@tanstack/react-table";
import { Calendar, FileSpreadsheet, Mail, MoreHorizontal, Pencil, Phone, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import TimelineEntryForm, { type TimelineEntryFormValues } from "@/components/features/timeline/TimelineEntryForm";
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
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyDash } from "@/components/ui/empty-dash";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { deleteTimelineEntryWithTrash, restoreTimelineEntryWithTrash } from "@/lib/actions/crm-trash";
import { timelineActivityBadgeClassName } from "@/lib/constants/timeline-activity-badge";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { normalizeTimelineBadgeActivityType } from "@/lib/validations/timeline";

import type { TimelineEntryWithJoins } from "@/types/database.types";

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

function activityIcon(t: string) {
  switch (t) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "meeting":
      return <Calendar className="h-4 w-4" />;
    case "import":
      return <FileSpreadsheet className="h-4 w-4" />;
    case "deleted":
      return <Trash2 className="h-4 w-4" />;
    case "ai_enrichment":
      return <Sparkles className="h-4 w-4" />;
    default:
      return <MoreHorizontal className="h-4 w-4" />;
  }
}

function isDeletionAuditEntry(entry: Pick<TimelineEntryWithJoins, "activity_type" | "title">): boolean {
  if (entry.activity_type !== "other") {
    return false;
  }
  return /(papierkorb verschoben|endgultig geloscht|endgültig gelöscht|geloscht|gelöscht)/i.test(entry.title ?? "");
}

function isAiEnrichmentAuditEntry(entry: Pick<TimelineEntryWithJoins, "activity_type" | "title">): boolean {
  if (entry.activity_type !== "other") {
    return false;
  }
  return /^ai enrichment applied\b/i.test(entry.title ?? "");
}

function resolveDisplayActivityType(
  entry: Pick<TimelineEntryWithJoins, "activity_type" | "title" | "content">,
): string {
  if (isDeletionAuditEntry(entry)) {
    return "deleted";
  }
  if (isAiEnrichmentAuditEntry(entry)) {
    return "ai_enrichment";
  }
  return normalizeTimelineBadgeActivityType(entry.activity_type, entry.title, entry.content);
}

/** Legacy `note` rows are shown like Sonstiges/Other after the type was removed from the picker. */
function badgeActivityType(entry: Pick<TimelineEntryWithJoins, "activity_type" | "title" | "content">): string {
  const t = resolveDisplayActivityType(entry);
  return t === "note" ? "other" : t;
}

function ActionCell({ entry }: { entry: TimelineEntryWithJoins }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const t = useT("timeline");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .is("deleted_at", null)
        .order("firmenname", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; firmenname: string; kundentyp?: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, email, telefon, position")
        .is("deleted_at", null)
        .order("nachname")
        .order("vorname")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleDelete = async () => {
    try {
      const mode = await deleteTimelineEntryWithTrash(entry.id);
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreTimelineEntryWithTrash(entry.id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["timeline"] });
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
    } catch (err) {
      if (err instanceof Error && err.message === TIMELINE_DELETE_NO_ACTIVE_ROW) {
        toast.error(t("toastDeleteAlreadyTrashedTitle"), {
          description: t("toastDeleteAlreadyTrashedDescription"),
        });
      } else {
        toast.error(t("toastDeleteFailed"));
      }
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (values: TimelineEntryFormValues) => {
      const res = await fetch(`/api/timeline/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("toastUpdated"));
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: () => {
      toast.error(t("toastUpdateFailed"));
    },
  });

  return (
    <div className="flex gap-2">
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editDialogDescription")}</DialogDescription>
          </DialogHeader>
          <TimelineEntryForm
            editEntry={entry}
            isSubmitting={updateMutation.isPending}
            companies={companies}
            contacts={contacts}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync(values);
            }}
            onCancel={() => setEditDialogOpen(false)}
          />
        </WideDialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("formCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("deleteConfirmAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TimelineTableProps {
  data?: TimelineEntryWithJoins[];
  isLoading?: boolean;
}

export default function TimelineTable({ data, isLoading }: TimelineTableProps = {}) {
  const [_pagination, _setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const t = useT("timeline");
  const localeTag = useNumberLocaleTag();

  const columnMenuLabel = useCallback(
    (id: string) => {
      const map: Record<string, string> = {
        created_at: t("colDateTime"),
        activity_type: t("colActivity"),
        profile: t("colUser"),
        company: t("colCompany"),
        contact: t("colContact"),
        title_content: t("colTitleBody"),
        actions: t("colActions"),
      };
      return map[id] ?? id;
    },
    [t],
  );

  const dataTableLabels = useMemo(
    () => ({
      exportCsv: t("tableExportCsv"),
      exportJson: t("tableExportJson"),
      rowsPerPage: t("tableRowsPerPage"),
      previous: t("tablePrevious"),
      next: t("tableNext"),
      empty: t("tableEmpty"),
      columnsTriggerAria: t("tableColumnsAria"),
      exportTriggerAria: t("tableExportAria"),
      rowSelectionSummary: (selected: number, total: number) =>
        t("tableRowsSelectedSummary", { selected, total }),
      pageRangeSummary: (from: number, to: number, total: number) =>
        total <= 0
          ? t("tablePageRangeEmpty")
          : t("tablePageRangeSummary", {
              from: from.toLocaleString(localeTag),
              to: to.toLocaleString(localeTag),
              total: total.toLocaleString(localeTag),
            }),
    }),
    [t, localeTag],
  );

  const columns = useMemo<ColumnDef<TimelineEntryWithJoins>[]>(
    () => [
      columnHelper.accessor("created_at", {
        id: "created_at",
        header: t("colDateTime"),
        enableSorting: true,
        cell: (info) => {
          const date = info.getValue();
          if (!date) {
            return <EmptyDash />;
          }
          const formatted = new Intl.DateTimeFormat(localeTag, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
            .format(new Date(date as string))
            .replace(",", "");
          return <span>{formatted}</span>;
        },
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.accessor("activity_type", {
        id: "activity_type",
        header: t("colActivity"),
        enableSorting: true,
        cell: (info) => {
          const type = badgeActivityType(info.row.original);
          const label =
            type === "call"
              ? t("activityCall")
              : type === "email"
                ? t("activityEmail")
                : type === "meeting"
                  ? t("activityMeeting")
                  : type === "import"
                    ? t("activityImport")
                    : type === "deleted"
                      ? t("activityDeleted")
                      : type === "ai_enrichment"
                        ? t("activityAiEnrichment")
                        : type === "other"
                          ? t("activityOther")
                          : type;
          return (
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1 rounded-full", timelineActivityBadgeClassName(type))}
            >
              {activityIcon(type)}
              {label}
            </Badge>
          );
        },
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.display({
        id: "profile",
        header: t("colUser"),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.profiles?.display_name || "";
          const b = rowB.original.profiles?.display_name || "";
          return a.localeCompare(b);
        },
        cell: (info) => <span>{info.row.original.profiles?.display_name || <EmptyDash />}</span>,
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.display({
        id: "company",
        header: t("colCompany"),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.companies?.firmenname || "";
          const b = rowB.original.companies?.firmenname || "";
          return a.localeCompare(b);
        },
        cell: (info) =>
          info.row.original.companies ? (
            <Link href={`/companies/${info.row.original.company_id}`} className="text-primary hover:underline">
              {info.row.original.companies.firmenname}
            </Link>
          ) : (
            <EmptyDash />
          ),
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.display({
        id: "contact",
        header: t("colContact"),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = `${rowA.original.contacts?.vorname || ""} ${rowA.original.contacts?.nachname || ""}`.trim();
          const b = `${rowB.original.contacts?.vorname || ""} ${rowB.original.contacts?.nachname || ""}`.trim();
          return a.localeCompare(b);
        },
        cell: (info) =>
          info.row.original.contacts ? (
            <Link href={`/contacts/${info.row.original.contact_id}`} className="text-primary hover:underline">
              {info.row.original.contacts.vorname} {info.row.original.contacts.nachname}
            </Link>
          ) : (
            <EmptyDash />
          ),
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.display({
        id: "title_content",
        header: t("colTitleBody"),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.title || "";
          const b = rowB.original.title || "";
          return a.localeCompare(b);
        },
        cell: (info) => (
          <div className="space-y-1">
            <div className="font-medium">{info.row.original.title}</div>
            <div className="text-sm text-muted-foreground">{info.row.original.content || <EmptyDash />}</div>
          </div>
        ),
      }) as ColumnDef<TimelineEntryWithJoins>,
      columnHelper.display({
        id: "actions",
        header: t("colActions"),
        cell: (info) => <ActionCell entry={info.row.original} />,
      }) as ColumnDef<TimelineEntryWithJoins>,
    ],
    [t, localeTag],
  );

  const { data: internalData = [], isLoading: internalLoading, error: internalError } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("timeline")
        .select(`
          *,
          companies:company_id (firmenname, status, kundentyp),
          contacts:contact_id (vorname, nachname, position, email),
          profiles:updated_by (display_name)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return rows as TimelineEntryWithJoins[];
    },
    enabled: !data,
  });

  const finalData = data || internalData;
  const finalIsLoading = isLoading !== undefined ? isLoading : internalLoading;

  if (internalError && !data) {
    return (
      <div className="text-destructive p-4">
        {t("loadError", { message: internalError.message })}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={finalData}
      loading={finalIsLoading}
      searchPlaceholder={t("searchPlaceholder")}
      columnMenuLabel={columnMenuLabel}
      labels={dataTableLabels}
    />
  );
}
