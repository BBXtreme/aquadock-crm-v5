// src/lib/query/keys.ts
// ... existing code ...

export const searchKeys = {
  all: ["search"] as const,
  results: (query: string) => [...searchKeys.all, "results", query] as const,
};
