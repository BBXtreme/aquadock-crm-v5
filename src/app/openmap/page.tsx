import { OpenMapClient } from "@/components/features/map/OpenMapClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  let companies: CompanyForOpenMap[] = [];
  let error: string | null = null;

  try {
    companies = await getCompaniesForOpenMap(await createServerSupabaseClient());
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
