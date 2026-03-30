// src/app/(protected)/openmap/page.tsx
// This file defines the OpenMap page of the application, which displays an interactive map with company locations.
// It uses a client component (OpenMapClient) to render the map and handle interactions, while the server component
// fetches the necessary company data from Supabase and passes it as props to the client component.
// The page also handles potential errors during data fetching and displays an appropriate message if the map cannot be loaded.

export const dynamic = "force-dynamic";

import { OpenMapClient } from "@/components/features/map/OpenMapClient";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default async function OpenMapPage() {
  const _user = await requireUser();

  let companies: CompanyForOpenMap[] = [];
  let error: string | null = null;

  try {
    companies = await getCompaniesForOpenMap(await createServerSupabaseClient());
  } catch (_err: unknown) {
    error = "Fehler beim Laden der Karte. Bitte versuche es erneut.";
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <OpenMapClient initialCompanies={companies} error={error} />
    </div>
  );
}
