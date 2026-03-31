import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth/require-user";
import TemplatesClient from "./TemplatesClient";

export default async function TemplatesPage() {
  await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <Suspense fallback={<div>Loading templates...</div>}>
        <TemplatesClient />
      </Suspense>
    </div>
  );
}
