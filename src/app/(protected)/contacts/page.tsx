// src/app/contacts/page.tsx
// This file defines the Contacts page of the application, which displays a list of contacts and allows users to create, edit, and delete contacts.
// It uses React Query to fetch contact data from the server and manage state for creating, updating, and deleting contacts.
// The page includes a dialog for creating new contacts and editing existing ones, as well as a confirmation dialog for deletions.
// Each contact entry displays relevant information such as name, email, phone number, associated company, and whether it's a primary contact.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientContactsPage from "./ClientContactsPage";

export default async function ContactsPage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Nice Loading Skeleton for Contacts */}
        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton key="contacts-stat-1" className="h-28 rounded-2xl" />
                <Skeleton key="contacts-stat-2" className="h-28 rounded-2xl" />
                <Skeleton key="contacts-stat-3" className="h-28 rounded-2xl" />
                <Skeleton key="contacts-stat-4" className="h-28 rounded-2xl" />
              </div>

              {/* Contacts List Skeleton */}
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`contacts-skeleton-row-${i}`}
                    className="flex items-center gap-6 p-6 border border-border bg-card rounded-2xl"
                  >
                    {/* Avatar */}
                    <Skeleton className="h-14 w-14 rounded-full shrink-0" />

                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Name + Position */}
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-72" />
                        <Skeleton className="h-5 w-32 rounded-full" />
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <Skeleton className="h-4 w-52" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <ClientContactsPage />
        </Suspense>
      </div>
    </div>
  );
}