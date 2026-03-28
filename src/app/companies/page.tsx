"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CompanyHeader } from "@/components/company-detail/CompanyHeader";
import KPICards from "@/components/dashboard/KPICards";
import { CSVImportDialog } from "@/components/features/companies/CSVImportDialog";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/browser";
import { getCompanies, getKpis } from "@/lib/supabase/services/companies";

export default function CompaniesPage() {
  const router = useRouter();
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    kundentyp: "",
    search: "",
  });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "firmenname", desc: false }]);

  const queryClient = useQueryClient();

  const { data: kpis } = useQuery(["kpis"], () => getKpis(createClient()));

  const { data, isLoading } = useQuery(["companies", filters, pagination, sorting], () =>
    getCompanies(createClient(), {
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      statusFilters: filters.status ? [filters.status] : [],
      kundentypFilters: filters.kundentyp ? [filters.kundentyp] : [],
      sortBy: sorting[0]?.id || "firmenname",
      sortDesc: sorting[0]?.desc || false,
    }),
  );

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
      <CompanyHeader
        company={{
          firmenname: "Companies",
          status: "lead",
          kundentyp: "sonstige",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        id="companies"
        router={router}
      />
      <KPICards kpis={kpis} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
            <SelectItem value="gewonnen">Gewonnen</SelectItem>
            <SelectItem value="verloren">Verloren</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.kundentyp} onValueChange={(value) => setFilters({ ...filters, kundentyp: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Kundentyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="marina">Marina</SelectItem>
            <SelectItem value="camping">Camping</SelectItem>
            <SelectItem value="sonstige">Sonstige</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search companies..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <Button>New Company</Button>
      </div>

      <CompaniesTable
        companies={data?.data || []}
        globalFilter={filters.search}
        onGlobalFilterChange={(value) => setFilters({ ...filters, search: value })}
        pageCount={Math.ceil((data?.total || 0) / pagination.pageSize)}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        onImportCSV={handleImportCSV}
      />

      <CSVImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onSuccess={handleImportSuccess} />
    </div>
  );
}
