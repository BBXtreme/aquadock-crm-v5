import { OpenMapClient } from "@/components/features/OpenMapClient";
import { type CompanyForOpenMap, getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  let companies: CompanyForOpenMap[] = [];
  let error: string | null = null;

  try {
    companies = await getCompaniesForOpenMap("dev-mock-user-11111111-2222-3333-4444-555555555555");

    console.log(`[OpenMap Page] Successfully loaded ${companies.length} companies with geo data`);
  } catch (err: any) {
    console.error("[OpenMap Page] Failed to load companies:", err);
    error = err.message || "Could not load map data. Please try refreshing the page.";
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <OpenMapClient initialCompanies={companies} error={error} />
    </div>
  );
}
