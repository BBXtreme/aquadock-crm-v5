import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";
import { OpenMapClient } from "@/components/features/OpenMapClient";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function OpenMapPage() {
  const cookieStore = cookies();
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  let companies: any[] = [];

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
