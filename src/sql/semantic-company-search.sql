-- Semantic + hybrid company search (idempotent).
-- Run in Supabase SQL Editor before enabling the app-side semantic path.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS search_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_companies_search_embedding_hnsw
  ON public.companies
  USING hnsw (search_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

DROP FUNCTION IF EXISTS public.hybrid_company_search(
  text,
  vector,
  integer,
  integer,
  double precision,
  double precision
);

DROP FUNCTION IF EXISTS public.hybrid_company_search(
  text,
  vector,
  integer,
  integer,
  double precision,
  double precision,
  double precision
);

-- Two design choices that materially affect recall:
--
--  1. `fts_query` OR-joins the query tokens before handing them to
--     `websearch_to_tsquery`. Default websearch semantics are AND
--     (`hotel & meerblick & ostsee`), which almost never matches on
--     multi-word conceptual queries. OR semantics let `ts_rank_cd` do the
--     sorting: docs matching more tokens rank higher, fewer-match docs
--     rank lower but still contribute to RRF. Stopwords like "mit / auf /
--     der" are still dropped by the german tsearch configuration.
--
--  2. `p_max_vector_distance` (cosine distance, 0..2) gates the vector
--     CTE. Without it, `hybrid_company_search` pads the result set with
--     the "least bad" nearest neighbours, so random English queries look
--     like they "find something". Empirical distribution on this dataset
--     with `text-embedding-3-small`:
--       doc-to-doc p50=0.42, p90=0.48, max=0.55.
--     Query-to-doc distances shift slightly higher because short queries
--     embed differently from multi-field documents. 0.5 is the working
--     default: admits on-topic conceptual German queries while still
--     rejecting off-topic and cross-language noise. FTS matches are kept
--     regardless of this threshold.
CREATE OR REPLACE FUNCTION public.hybrid_company_search(
  p_query text,
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 200,
  p_rrf_k integer DEFAULT 60,
  p_fts_weight double precision DEFAULT 1.0,
  p_vector_weight double precision DEFAULT 1.0,
  p_max_vector_distance double precision DEFAULT 0.5
)
RETURNS TABLE (
  company_id uuid,
  rrf_score double precision,
  fts_rank integer,
  vector_rank integer
)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT
      trim(coalesce(p_query, '')) AS query_text,
      GREATEST(COALESCE(p_match_count, 200), 1) AS match_count,
      GREATEST(COALESCE(p_rrf_k, 60), 1) AS rrf_k,
      GREATEST(COALESCE(p_fts_weight, 1.0), 0.0) AS fts_weight,
      GREATEST(COALESCE(p_vector_weight, 1.0), 0.0) AS vector_weight,
      GREATEST(COALESCE(p_max_vector_distance, 0.5), 0.0) AS max_vector_distance,
      CASE
        WHEN trim(coalesce(p_query, '')) = '' THEN NULL
        ELSE websearch_to_tsquery(
          'german',
          regexp_replace(trim(p_query), '\s+', ' OR ', 'g')
        )
      END AS fts_query
  ),
  fts_ranked AS (
    SELECT
      c.id AS company_id,
      row_number() OVER (
        ORDER BY ts_rank_cd(c.search_vector, p.fts_query) DESC, c.id
      )::integer AS fts_rank
    FROM public.companies AS c
    CROSS JOIN params AS p
    WHERE c.deleted_at IS NULL
      AND p.fts_query IS NOT NULL
      AND c.search_vector @@ p.fts_query
    LIMIT (SELECT match_count FROM params)
  ),
  vector_candidates AS (
    SELECT
      c.id AS company_id,
      (c.search_embedding <=> p_query_embedding) AS distance
    FROM public.companies AS c
    CROSS JOIN params AS p
    WHERE c.deleted_at IS NULL
      AND p_query_embedding IS NOT NULL
      AND c.search_embedding IS NOT NULL
      AND (c.search_embedding <=> p_query_embedding) <= p.max_vector_distance
    ORDER BY c.search_embedding <=> p_query_embedding
    LIMIT (SELECT match_count FROM params)
  ),
  vector_ranked AS (
    SELECT
      company_id,
      row_number() OVER (ORDER BY distance, company_id)::integer AS vector_rank
    FROM vector_candidates
  ),
  fused AS (
    SELECT
      coalesce(f.company_id, v.company_id) AS company_id,
      f.fts_rank,
      v.vector_rank
    FROM fts_ranked AS f
    FULL OUTER JOIN vector_ranked AS v ON v.company_id = f.company_id
  )
  SELECT
    fused.company_id,
    (
      COALESCE(fts_weight / (rrf_k + fused.fts_rank), 0.0) +
      COALESCE(vector_weight / (rrf_k + fused.vector_rank), 0.0)
    ) AS rrf_score,
    fused.fts_rank,
    fused.vector_rank
  FROM fused
  CROSS JOIN params
  ORDER BY rrf_score DESC, fused.company_id
  LIMIT (SELECT match_count FROM params);
$$;