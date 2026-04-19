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

CREATE OR REPLACE FUNCTION public.hybrid_company_search(
  p_query text,
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 200,
  p_rrf_k integer DEFAULT 60,
  p_fts_weight double precision DEFAULT 1.0,
  p_vector_weight double precision DEFAULT 1.0
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
      GREATEST(COALESCE(p_vector_weight, 1.0), 0.0) AS vector_weight
  ),
  fts_ranked AS (
    SELECT
      c.id AS company_id,
      row_number() OVER (
        ORDER BY ts_rank_cd(c.search_vector, websearch_to_tsquery('simple', p.query_text)) DESC, c.id
      )::integer AS fts_rank
    FROM public.companies AS c
    CROSS JOIN params AS p
    WHERE c.deleted_at IS NULL
      AND p.query_text <> ''
      AND c.search_vector @@ websearch_to_tsquery('simple', p.query_text)
    LIMIT (SELECT match_count FROM params)
  ),
  vector_ranked AS (
    SELECT
      c.id AS company_id,
      row_number() OVER (
        ORDER BY c.search_embedding <=> p_query_embedding, c.id
      )::integer AS vector_rank
    FROM public.companies AS c
    CROSS JOIN params AS p
    WHERE c.deleted_at IS NULL
      AND p_query_embedding IS NOT NULL
      AND c.search_embedding IS NOT NULL
    LIMIT (SELECT match_count FROM params)
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