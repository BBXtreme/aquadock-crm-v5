import { getCompaniesForOpenMap, CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { OpenMapClient } from "@/components/features/OpenMapClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function OpenMapPage() {
  const _cookieStore = cookies();
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  let companies: CompanyForOpenMap[] = [];

  try {
    companies = await getCompaniesForOpenMap(user.id);
  } catch (error) {
    console.error("[OpenMap Page] Failed to load companies:", error);
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <OpenMapClient initialCompanies={companies} />
    </div>
  );
}
