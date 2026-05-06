/** `user_settings.key` values for semantic / hybrid company search (EAV, optional rows). */

export const EMBEDDING_PROVIDER_KEY = "embedding_provider" as const;
export const EMBEDDING_MODEL_KEY = "embedding_model" as const;
export const SEMANTIC_SEARCH_ENABLED_KEY = "semantic_search_enabled" as const;
export const AUTO_BACKFILL_EMBEDDINGS_KEY = "auto_backfill_embeddings" as const;
export const SHOW_SEMANTIC_BADGE_KEY = "show_semantic_badge" as const;
/** `strict` | `balanced` | `broad` — maps to `p_max_vector_distance` in `hybrid_company_search`. */
export const SEMANTIC_MATCH_STRICTNESS_KEY = "semantic_match_strictness" as const;

export const SEMANTIC_MATCH_STRICTNESS_CHOICES = ["strict", "balanced", "broad"] as const;
export type SemanticMatchStrictness = (typeof SEMANTIC_MATCH_STRICTNESS_CHOICES)[number];
