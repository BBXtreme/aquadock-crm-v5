import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { createCompany, updateCompany, deleteCompany } from "@/lib/supabase/services/companies";
import type { Company } from "@/lib/supabase/types";

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (company: Omit<Company, "id" | "created_at" | "updated_at">) =>
      createCompany(company, supabase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Firma erstellt");
    },
    onError: (error: any) => {
      // Handle field-specific errors if available
      if (error.details && typeof error.details === "object") {
        // Assuming error.details has field errors
        Object.entries(error.details).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else {
        toast.error("Fehler beim Erstellen der Firma");
      }
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Company, "id" | "created_at" | "updated_at">> }) =>
      updateCompany(id, updates, supabase),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] });
      await queryClient.cancelQueries({ queryKey: ["company", id] });
      const previousCompanies = queryClient.getQueryData<Company[]>(["companies"]);
      const previousCompany = queryClient.getQueryData<Company>(["company", id]);

      queryClient.setQueryData<Company[]>(["companies"], (old) =>
        old ? old.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)) : []
      );

      queryClient.setQueryData<Company>(["company", id], (old) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : old
      );

      return { previousCompanies, previousCompany };
    },
    onError: (err, { id }, context) => {
      if (context?.previousCompanies) {
        queryClient.setQueryData(["companies"], context.previousCompanies);
      }
      if (context?.previousCompany) {
        queryClient.setQueryData(["company", id], context.previousCompany);
      }
      toast.error("Fehler beim Aktualisieren der Firma");
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      toast.success("Firma aktualisiert");
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (id: string) => {
      console.log("🔴 Attempting to delete company with ID:", id);
      return deleteCompany(id, supabase);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] });
      await queryClient.cancelQueries({ queryKey: ["company", id] });
      const previousCompanies = queryClient.getQueryData<Company[]>(["companies"]);
      const previousCompany = queryClient.getQueryData<Company>(["company", id]);

      queryClient.setQueryData<Company[]>(["companies"], (old) =>
        old ? old.filter((c) => c.id !== id) : []
      );

      queryClient.removeQueries({ queryKey: ["company", id] });

      return { previousCompanies, previousCompany };
    },
    onError: (err, id, context) => {
      console.dir(err);
      if (context?.previousCompanies) {
        queryClient.setQueryData(["companies"], context.previousCompanies);
      }
      if (context?.previousCompany) {
        queryClient.setQueryData(["company", id], context.previousCompany);
      }
      toast.error("Fehler beim Löschen der Firma");
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      toast.success("Firma gelöscht");
    },
  });
}
