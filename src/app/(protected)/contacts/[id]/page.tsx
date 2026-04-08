// src/app/contacts/[id]/page.tsx
// This file defines the Contact Detail page of the application, which displays detailed information about a specific contact.
// It uses server-side data fetching to load the contact and companies data, then passes it to a client component for interactivity.
// The page includes sections for contact details, and options to edit the contact and change the linked company.
// Note: The main page is a server component for data fetching, while interactive parts are handled by the client component.

import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingState } from "@/components/ui/LoadingState";
import { resolveContactDetail } from "@/lib/actions/contacts";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ContactDetailClient from "./ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const _user = await requireUser();

  const supabase = await createServerSupabaseClient();
  const resolved = await resolveContactDetail(id, supabase);

  if (resolved.kind === "missing") {
    notFound();
  }

  if (resolved.kind === "trashed") {
    redirect("/contacts?trashedContact=1");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, firmenname")
    .is("deleted_at", null);

  return (
    <Suspense fallback={<LoadingState count={8} />}>
      <ContactDetailClient contact={resolved.contact} companies={companies || []} />
    </Suspense>
  );
}
