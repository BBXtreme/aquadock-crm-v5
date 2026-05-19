BEGIN;

DROP POLICY IF EXISTS companies_select_authenticated ON public.companies;
DROP POLICY IF EXISTS companies_insert_owner ON public.companies;
DROP POLICY IF EXISTS companies_update_owner_or_admin ON public.companies;
DROP POLICY IF EXISTS companies_delete_owner_or_admin ON public.companies;

CREATE POLICY companies_select_authenticated ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY companies_insert_owner ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY companies_update_owner_or_admin ON public.companies
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY companies_delete_owner_or_admin ON public.companies
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS contacts_select_authenticated ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_owner ON public.contacts;
DROP POLICY IF EXISTS contacts_update_owner_or_admin ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_owner_or_admin ON public.contacts;

CREATE POLICY contacts_select_authenticated ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_app_admin())
  );

CREATE POLICY contacts_insert_owner ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY contacts_update_owner_or_admin ON public.contacts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

CREATE POLICY contacts_delete_owner_or_admin ON public.contacts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_app_admin()));

COMMIT;;
