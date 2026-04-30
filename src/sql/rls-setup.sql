-- =============================================================================
-- SUPERSEDED — AquaDock CRM v5 core table RLS (owner-only prototype)
-- =============================================================================
-- Production uses collaborative read + owner/admin write:
--
--   1. src/sql/rls-helpers.sql                       — public.is_app_admin()
--   2. src/sql/core-crm-rls-collaborative.sql        — companies, contacts, reminders, timeline, email_*
--   3. src/sql/rls-profiles-settings-consolidate.sql — profiles, user_settings
--
-- Company comments (order):
--   src/sql/comments-rls.sql
--   src/sql/comments-trash-alignment.sql
--   src/sql/comments-attachments-delete-policy.sql
--
-- Phase 0 snapshot queries: src/sql/rls-rollout-backup-queries.sql
-- Optional post-deploy: src/sql/rls-post-deploy-hardening.sql
--
-- The DDL below is the historical per-user isolation script only — do not apply on production
-- unless you intentionally revert to strict owner-only SELECT.

/*
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
-- … legacy policy statements omitted — see git history if needed.
*/
