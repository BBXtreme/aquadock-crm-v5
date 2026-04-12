/** `user_settings.key` values for AI enrichment (EAV, optional rows). */

export const AI_ENRICHMENT_ENABLED_KEY = "ai_enrichment_enabled" as const;
export const AI_ENRICHMENT_DAILY_LIMIT_KEY = "ai_enrichment_daily_limit" as const;
export const AI_ENRICHMENT_MODEL_PREFERENCE_KEY = "ai_enrichment_model_preference" as const;
/** Vercel AI Gateway model id for the first attempt (auto / primary-only). */
export const AI_ENRICHMENT_PRIMARY_MODEL_KEY = "ai_enrichment_primary_model" as const;
/** Vercel AI Gateway model id for fallback after retriable failures (auto). */
export const AI_ENRICHMENT_SECONDARY_MODEL_KEY = "ai_enrichment_secondary_model" as const;
export const AI_ENRICHMENT_ADDRESS_FOCUS_KEY = "ai_enrichment_address_focus" as const;
/** Fast web search (company modal): Perplexity `maxResults` (1–8). */
export const AI_ENRICHMENT_PERPLEXITY_FAST_MAX_RESULTS_KEY = "ai_enrichment_perplexity_fast_max_results" as const;
/** Fast web search: Perplexity `searchRecencyFilter` (`month` | `year`). */
export const AI_ENRICHMENT_PERPLEXITY_FAST_RECENCY_KEY = "ai_enrichment_perplexity_fast_recency" as const;
/** Count of successful enrichment runs for the UTC day in `AI_ENRICHMENT_LAST_RESET_DATE_KEY`. */
export const AI_ENRICHMENT_USED_TODAY_KEY = "ai_enrichment_used_today" as const;
/** UTC calendar date `YYYY-MM-DD` matching `used_today`; when it differs from today, usage is treated as 0. */
export const AI_ENRICHMENT_LAST_RESET_DATE_KEY = "ai_enrichment_last_reset_date" as const;

/** Default daily cap when no user_settings row exists (env override). */
export const AI_ENRICHMENT_DEFAULT_DAILY_LIMIT = 30;
