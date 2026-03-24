import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

const DynamicOpenMap = dynamic(() => import("@/components/features/OpenMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30">
      <div className="animate-pulse text-muted-foreground">OpenMap wird geladen...</div>
    </div>
  ),
});

export default async function OpenMapPage() {
  const cookieStore = cookies();
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  let companies = [];

  try {
    companies = await getCompaniesForOpenMap(user.id);
  } catch (error) {
    console.error("[OpenMap Page] Failed to load companies:", error);
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <DynamicOpenMap initialCompanies={companies} />
    </div>
  );
}
