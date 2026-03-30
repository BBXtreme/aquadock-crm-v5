// src/app/contacts/[id]/page.tsx
// This file defines the Contact Detail page of the application, which displays detailed information about a specific contact.
// It uses server-side data fetching to load the contact and companies data, then passes it to a client component for interactivity.
// The page includes sections for contact details, and options to edit the contact and change the linked company.
// Note: The main page is a server component for data fetching, while interactive parts are handled by the client component.

import { Suspense } from "react";

import { LoadingState } from "@/components/ui/LoadingState";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getContactById } from "@/lib/supabase/services/contacts";
import ContactDetailClient from "./ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const supabase = await createServerSupabaseClient();
    const contact = await getContactById(id, supabase);

    if (!contact) {
      return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">Contact Not Found</p>
          </div>
        </div>
      );
    }

    const { data: companies } = await supabase.from("companies").select("id, firmenname");

    return (
      <Suspense fallback={<LoadingState count={8} />}>
        <ContactDetailClient contact={contact} companies={companies || []} />
      </Suspense>
    );
  } catch (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error instanceof Error ? error.message : "Failed to load contact"}</p>
        </div>
      </div>
    );
  }
}
