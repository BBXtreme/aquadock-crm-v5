"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/browser";
import type { BrevoContactWithCompany } from "@/types/brevo";

export const brevoRecipientContactsQueryKey = ["contacts-with-company"] as const;

export function useBrevoRecipientContacts() {
  return useQuery({
    queryKey: brevoRecipientContactsQueryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(kundentyp, status)")
        .is("deleted_at", null);
      if (error) throw error;
      return data as BrevoContactWithCompany[];
    },
    staleTime: 60 * 1000,
  });
}
