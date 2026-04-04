"use client";

import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/browser";
import { formatDateDistance } from "@/lib/utils/data-format";
import type { TimelineEntryWithJoins } from "@/types/database.types";

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const columns = [
  columnHelper.display({
    id: "title-description",
    header: "Titel & Beschreibung",
    cell: (info) => {
      const title = info.row.original.title;
      const content = info.row.original.content;
      return (
        <div>
          <div className="font-medium">{title}</div>
          {content && <div className="text-sm text-muted-foreground">{content}</div>}
        </div>
      );
    },
  }),
  columnHelper.accessor("activity_type", {
    header: "Aktivität",
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: "company",
    header: "Firma",
    cell: (info) => {
      const company = info.row.original.companies;
      if (!company) return <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">
          {company.firmenname}
        </Link>
      );
    },
  }),
  columnHelper.display({
    id: "contact",
    header: "Kontakt",
    cell: (info) => {
      const contact = info.row.original.contacts;
      if (!contact) return <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
          {contact.vorname} {contact.nachname}
        </Link>
      );
    },
  }),
  columnHelper.accessor("user_name", {
    header: "Benutzer",
    cell: (info) => info.getValue() || <span className="text-muted-foreground">-</span>,
  }),
  columnHelper.accessor("created_at", {
    header: "Erstellt am",
    cell: (info) => formatDateDistance(info.getValue()),
  }),
] satisfies ColumnDef<TimelineEntryWithJoins>[];

interface TimelineTableProps {
  companyId?: string;
  contactId?: string;
}

export function TimelineTable({ companyId, contactId }: TimelineTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const queryKey = useMemo(
    () => ["timeline", companyId, contactId, pagination.pageIndex, pagination.pageSize],
    [companyId, contactId, pagination.pageIndex, pagination.pageSize]
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("timeline")
        .select(`
          *,
          companies:company_id (
            id,
            firmenname,
            status,
            kundentyp
          ),
          contacts:contact_id (
            id,
            vorname,
            nachname,
            position,
            email
          ),
          profiles:user_id (
            display_name
          )
        `)
        .order("created_at", { ascending: false });

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query.range(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize - 1
      );

      if (error) throw error;
      return data as TimelineEntryWithJoins[];
    },
    enabled: true,
  });

  const { data: countData } = useQuery({
    queryKey: ["timeline-count", companyId, contactId],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase.from("timeline").select("*", { count: "exact", head: true });

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: true,
  });

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading timeline: {error.message}</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data || []}
      loading={isLoading}
      pagination={pagination}
      onPaginationChange={setPagination}
      totalCount={countData || 0}
      skeletonRows={pagination.pageSize}
    />
  );
}
