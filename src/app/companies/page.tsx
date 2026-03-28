"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CSVImportDialog } from "@/components/features/companies/CSVImportDialog";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/browser";
import { getCompanies } from "@/lib/supabase/services/companies";

export default function CompaniesPage() {
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "firmenname", desc: false }]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["companies", pagination, sorting, globalFilter],
    queryFn: () =>
      getCompanies(createClient(), {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sortBy: sorting[0]?.id || "firmenname",
        sortDesc: sorting[0]?.desc || false,
      }),
  });

  const handleImportCSV = () => {
    setCsvDialogOpen(true);
  };

  const handleImportSuccess = (result: { imported: number; errors: string[] }) => {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    window.dispatchEvent(new CustomEvent("company-imported"));
    if (result.errors.length > 0) {
      toast.error(`Import failed: ${result.errors.join(", ")}`);
    } else {
      toast.success(`Imported ${result.imported} companies successfully`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Companies</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Import</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={handleImportCSV}>CSV</DropdownMenuItem>
            <DropdownMenuItem disabled>JSON (coming soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CompaniesTable
        companies={data?.data || []}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pageCount={Math.ceil((data?.total || 0) / pagination.pageSize)}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
      />

      <CSVImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onSuccess={handleImportSuccess} />
    </div>
  );
}
