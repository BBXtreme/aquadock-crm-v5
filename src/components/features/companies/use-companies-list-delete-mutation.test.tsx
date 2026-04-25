import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCompaniesListDeleteMutation } from "@/components/features/companies/use-companies-list-delete-mutation";
import type { SearchCompaniesListResult } from "@/lib/server/companies-search";
import type { CompaniesFilterGroup } from "@/lib/utils/company-filters-url-state";
import type { Company } from "@/types/database.types";

const deleteCompany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/companies", () => ({
  deleteCompany,
}));

const restoreCompanyWithTrash = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/crm-trash", () => ({
  restoreCompanyWithTrash,
}));

const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const emptyFilters: Record<CompaniesFilterGroup, string[]> = {
  status: [],
  kategorie: [],
  betriebstyp: [],
  land: [],
  wassertyp: [],
};

const sorting = [{ id: "firmenname", desc: false }];

function mockT(): ReturnType<typeof useTranslations<"companies">> {
  return ((key: string) => key) as ReturnType<typeof useTranslations<"companies">>;
}

function listFixture(): SearchCompaniesListResult {
  return {
    companies: [
      { id: COMPANY_A, firmenname: "Alpha Co" } as Company,
      { id: COMPANY_B, firmenname: "Beta Co" } as Company,
    ],
    totalCount: 2,
    globalSearchStrategy: "none",
  };
}

function listQueryKey(activeFilters: Record<CompaniesFilterGroup, string[]>) {
  return ["companies", 0, 20, activeFilters, null, sorting, false, ""] as const;
}

describe("useCompaniesListDeleteMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreCompanyWithTrash.mockResolvedValue(undefined);
  });

  it("optimistically removes the company from the list cache before the mutation resolves", async () => {
    deleteCompany.mockImplementation(
      () => new Promise<"soft">(() => {
        /* never resolves */
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(queryClient, "refetchQueries").mockImplementation(() => Promise.resolve());

    const initial = listFixture();
    const key = listQueryKey(emptyFilters);
    queryClient.setQueryData([...key], initial);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useCompaniesListDeleteMutation({
          pagination: { pageIndex: 0, pageSize: 20 },
          activeFilters: emptyFilters,
          waterFilter: null,
          sorting,
          sortExplicit: false,
          debouncedGlobalFilter: "",
          t: mockT(),
        }),
      { wrapper },
    );

    result.current.mutate(COMPANY_A);

    await waitFor(() => {
      const data = queryClient.getQueryData<SearchCompaniesListResult>([...key]);
      expect(data?.companies).toHaveLength(1);
      expect(data?.companies[0]?.id).toBe(COMPANY_B);
      expect(data?.totalCount).toBe(1);
    });
  });

  it("rolls back cache and shows toast on delete failure", async () => {
    deleteCompany.mockRejectedValueOnce(new Error("network"));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(queryClient, "refetchQueries").mockImplementation(() => Promise.resolve());

    const initial = listFixture();
    const key = listQueryKey(emptyFilters);
    queryClient.setQueryData([...key], initial);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useCompaniesListDeleteMutation({
          pagination: { pageIndex: 0, pageSize: 20 },
          activeFilters: emptyFilters,
          waterFilter: null,
          sorting,
          sortExplicit: false,
          debouncedGlobalFilter: "",
          t: mockT(),
        }),
      { wrapper },
    );

    await expect(result.current.mutateAsync(COMPANY_A)).rejects.toThrow("network");

    expect(queryClient.getQueryData<SearchCompaniesListResult>([...key])).toEqual(initial);
    expect(toastError).toHaveBeenCalledWith("toastDeleteFailed", { description: "network" });
  });

  it("refetches lists and shows success toast after soft delete", async () => {
    deleteCompany.mockResolvedValueOnce("soft");

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries").mockImplementation(() => Promise.resolve());

    const initial = listFixture();
    const key = listQueryKey(emptyFilters);
    queryClient.setQueryData([...key], initial);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useCompaniesListDeleteMutation({
          pagination: { pageIndex: 0, pageSize: 20 },
          activeFilters: emptyFilters,
          waterFilter: null,
          sorting,
          sortExplicit: false,
          debouncedGlobalFilter: "",
          t: mockT(),
        }),
      { wrapper },
    );

    await result.current.mutateAsync(COMPANY_A);

    expect(deleteCompany).toHaveBeenCalledWith(COMPANY_A);
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ["companies"] });
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ["companies-stats"] });
    expect(toastSuccess).toHaveBeenCalledWith(
      "toastDeleted",
      expect.objectContaining({
        action: expect.objectContaining({
          label: "Rückgängig",
          onClick: expect.any(Function),
        }),
      }),
    );
  });
});
