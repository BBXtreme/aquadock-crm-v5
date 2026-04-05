// src/lib/validations/search.ts
import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
}).strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;
