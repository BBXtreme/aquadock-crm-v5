// src/components/features/brevo/BrevoCampaignList.tsx
"use client";

import { BrevoClient } from "@getbrevo/brevo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";

type BrevoCampaign = {
  id: number;
  name: string;
  subject: string;
  status: string;
  createdAt: string;
};

const columnHelper = createColumnHelper<BrevoCampaign>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created At",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
] satisfies ColumnDef<BrevoCampaign>[];

async function fetchBrevoCampaigns(): Promise<BrevoCampaign[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "brevo_api_key")
    .single();

  if (!settings?.value) throw new Error("Brevo API key not found");

  const apiKey = settings.value as string;
  const brevo = new BrevoClient({ apiKey });
  const emailCampaignsApi = brevo.emailCampaigns;
  const response = await emailCampaignsApi.getEmailCampaigns();
  return response.campaigns.map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    status: campaign.status,
    createdAt: campaign.createdAt,
  }));
}

export default function BrevoCampaignList() {
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["brevo-campaigns"],
    queryFn: fetchBrevoCampaigns,
  });

  const table = useReactTable({
    data: campaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["brevo-campaigns"] });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Brevo Campaigns</h2>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
