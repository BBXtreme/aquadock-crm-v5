BEGIN;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;

CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own_or_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_app_admin()));

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_app_admin()));

DROP POLICY IF EXISTS user_settings_own_all ON public.user_settings;

CREATE POLICY user_settings_own_all ON public.user_settings
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;;
