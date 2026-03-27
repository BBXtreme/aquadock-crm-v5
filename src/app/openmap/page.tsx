import { OpenMapClient } from "@/components/features/OpenMapClient";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  let companies: CompanyForOpenMap[] = [];
  let error: string | null = null;

  try {
    companies = await getCompaniesForOpenMap();

    console.log(`[OpenMap Page] Successfully loaded ${companies.length} companies with geo data`);
  } catch (err: unknown) {
    console.error("[OpenMap Page] Failed to load companies:", err);
    error = "Fehler beim Laden der Karte. Bitte versuche es erneut.";
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <OpenMapClient initialCompanies={companies} error={error} />
    </div>
  );
}
