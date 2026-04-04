"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDistance } from "@/lib/utils/data-format";
import { safeDisplay } from "@/lib/utils/data-format";
import { TimelineEntryWithJoins } from "@/types/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const columns = [
  columnHelper.accessor("activity_type", {
    header: "Aktivität",
    cell: (info) => (
      <Badge variant="outline" className="capitalize">
        {safeDisplay(info.getValue())}
      </Badge>
    ),
  }),
  columnHelper.accessor("title", {
    header: "Titel",
    cell: (info) => <span className="font-medium">{safeDisplay(info.getValue())}</span>,
  }),
  columnHelper.accessor("content", {
    header: "Beschreibung",
    cell: (info) => <span className="text-muted-foreground">{safeDisplay(info.getValue())}</span>,
  }),
  columnHelper.accessor("created_at", {
    header: "Datum",
    cell: (info) => formatDateDistance(info.getValue()),
  }),
  columnHelper.accessor("companies", {
    header: "Firma",
    cell: (info) => {
      const company = info.getValue();
      if (!company) return <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/companies/${company.id}`} className="flex items-center gap-1 hover:underline">
          {safeDisplay(company.firmenname)}
          <ExternalLink className="h-3 w-3" />
        </Link>
      );
    },
  }),
  columnHelper.accessor("contacts", {
    header: "Kontakt",
    cell: (info) => {
      const contact = info.getValue();
      if (!contact) return <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-1 hover:underline">
          {safeDisplay(contact.vorname)} {safeDisplay(contact.nachname)}
          <ExternalLink className="h-3 w-3" />
        </Link>
      );
    },
  }),
  columnHelper.accessor("profiles", {
    header: "User",
    cell: (info) => {
      const profile = info.getValue();
      if (!profile) return <span className="text-muted-foreground">-</span>;
      return <span>{safeDisplay(profile.display_name)}</span>;
    },
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
