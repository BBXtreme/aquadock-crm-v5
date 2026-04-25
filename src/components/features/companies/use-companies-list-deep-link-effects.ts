"use client";

import type { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";
import type { CompaniesListRouter } from "@/components/features/companies/use-companies-list-url-sync";

type CompaniesT = ReturnType<typeof useTranslations<"companies">>;

export function useCompaniesListDeepLinkEffects(options: {
  openCreateFromQuery: boolean;
  trashedCompanyRedirect: boolean;
  searchParamsString: string;
  pathname: string;
  router: CompaniesListRouter;
  t: CompaniesT;
  setDialogOpen: (open: boolean) => void;
}): void {
  const {
    openCreateFromQuery,
    trashedCompanyRedirect,
    searchParamsString,
    pathname,
    router,
    t,
    setDialogOpen,
  } = options;

  useEffect(() => {
    if (openCreateFromQuery) {
      setDialogOpen(true);
    }
  }, [openCreateFromQuery, setDialogOpen]);

  useEffect(() => {
    if (!trashedCompanyRedirect) {
      return;
    }
    toast.message(t("toastTrashedCompany"));
    const next = new URLSearchParams(searchParamsString);
    next.delete("trashedCompany");
    const qs = next.toString();
    router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [trashedCompanyRedirect, router, t, searchParamsString, pathname]);
}
