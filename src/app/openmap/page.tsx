import { OpenMapClient } from "@/components/features/OpenMapClient";
import { type CompanyForOpenMap, getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  let companies: CompanyForOpenMap[] = [];

  try {
    // For now we fetch without user filter (since no auth yet)
    // Later we will add proper user_id filtering
    companies = await getCompaniesForOpenMap(""); // temporary empty string
  } catch (error) {
    console.error("[OpenMap Page] Failed to load companies:", error);
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <OpenMapClient initialCompanies={companies} />
    </div>
  );
}
