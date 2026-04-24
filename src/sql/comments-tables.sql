-- Company comments (Phase 1) + optional attachments (schema only for UI later).
-- Prerequisite: public.profiles must exist — run profiles-table.sql first (FK on created_by / updated_by / deleted_by).
-- Apply in Supabase SQL editor or via migration pipeline. RLS: see comments-rls.sql.
--
-- Fails fast with a clear message if this file is applied to the wrong/empty DB (avoids opaque 42P01 on CREATE TABLE).

DO $comments_prereq$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION
      'public.profiles is missing. Apply src/sql/profiles-table.sql on THIS database (same Supabase project / connection), then run comments-tables.sql again.';
  END IF;
  IF to_regclass('public.companies') IS NULL THEN
    RAISE EXCEPTION
      'public.companies is missing. Create core CRM tables before comments-tables.sql.';
  END IF;
END
$comments_prereq$;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'company',
  entity_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments (id) ON DELETE CASCADE,
  body_markdown text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT comments_entity_type_check CHECK (entity_type = 'company'),
  CONSTRAINT comments_entity_id_fkey FOREIGN KEY (entity_id)
    REFERENCES public.companies (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_entity_created
  ON public.comments (entity_type, entity_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON public.comments (parent_id)
  WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE public.comments IS 'Thread-ready comments on CRM entities; Phase 1: company only.';

-- Keep updated_at in sync on row change
CREATE OR REPLACE FUNCTION public.set_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_set_updated_at ON public.comments;
CREATE TRIGGER trg_comments_set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_comments_updated_at();

-- Parent must belong to same entity (type + id)
CREATE OR REPLACE FUNCTION public.comments_validate_parent_entity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_entity_type text;
  p_entity_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.entity_type, c.entity_id
  INTO p_entity_type, p_entity_id
  FROM public.comments c
  WHERE c.id = NEW.parent_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'comments: parent comment not found or deleted';
  END IF;

  IF p_entity_type IS DISTINCT FROM NEW.entity_type OR p_entity_id IS DISTINCT FROM NEW.entity_id THEN
    RAISE EXCEPTION 'comments: parent entity mismatch';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_validate_parent ON public.comments;
CREATE TRIGGER trg_comments_validate_parent
  BEFORE INSERT OR UPDATE OF parent_id, entity_type, entity_id ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.comments_validate_parent_entity();

-- ---------------------------------------------------------------------------
-- comment_attachments (optional; no UI in Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  content_type text,
  byte_size bigint,
  storage_object_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id
  ON public.comment_attachments (comment_id);
