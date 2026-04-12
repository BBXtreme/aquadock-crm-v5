# Fast vs Full web search (company AI enrichment) — spec

## Behavior

- **Modal toggle** "Aktuelle Web-Suche verwenden": **OFF (default) = Fast**; **ON = Full**.
- **Fast:** max **2** Perplexity results, `searchRecencyFilter: "year"`, structuring forced to **Gemini 3 Flash + Grok 4.1 Fast**, tight digest/prompt; modal structuring override **ignored** in Fast.
- **Full:** unchanged vs today — `runtime.perplexityMaxResults` (5 or 3 low-cost), `searchRecencyFilter: "month"`, DE filter, respect **structuring** model + modal override.
- **Bulk** and **contact** enrichment: always **Full** (no API change for contact action; gateway contact path unchanged except shared Perplexity helper + timer labels).

## Files

- [src/lib/ai/company-enrichment-gateway.ts](src/lib/ai/company-enrichment-gateway.ts)
- [src/lib/actions/company-enrichment.ts](src/lib/actions/company-enrichment.ts)
- [src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx)
- [src/messages/de.json](src/messages/de.json), [en.json](src/messages/en.json), [hr.json](src/messages/hr.json)

## Diagnostics

- `console.time("Perplexity Phase")` / `console.timeEnd("Perplexity Phase")` and `console.time("Structuring Phase")` / `console.timeEnd("Structuring Phase")` around the two company phases (and same labels on contact for consistency).

## Quality

- `pnpm typecheck && pnpm check:fix`
