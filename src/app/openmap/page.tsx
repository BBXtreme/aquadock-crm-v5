import { OpenMapClient } from "@/components/features/OpenMapClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type CompanyForOpenMap, getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  let companies: CompanyForOpenMap[] = [];
  let error: string | null = null;

  try {
    // DEVELOPMENT ONLY: Skip auth for now, use mock user ID
    // TODO: Add authentication when user login is implemented
    const isDevelopment = process.env.NODE_ENV === "development";
    let userId = "dev-mock-user-11111111-2222-3333-4444-555555555555"; // Mock user ID for development

    if (!isDevelopment) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Authentication required. Please log in to access the map.");
      }
      userId = user.id;
    }

    companies = await getCompaniesForOpenMap(userId);

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
