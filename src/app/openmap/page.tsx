import { OpenMapClient } from "@/components/features/OpenMapClient";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  const companies = await getCompaniesForOpenMap("");

  return <OpenMapClient initialCompanies={companies} />;
}
