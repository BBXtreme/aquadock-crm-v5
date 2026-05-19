drop function if exists public.create_tournament_for_user(text, date, date);

create or replace function public.create_tournament_for_user(
  p_name text,
  p_starts_on date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if char_length(trim(p_name)) < 3 then
    raise exception 'name_too_short';
  end if;

  v_tournament_id := gen_random_uuid();
  insert into public.tournaments (id, name, starts_on, ends_on, status)
  values (v_tournament_id, p_name, p_starts_on, null, 'draft');

  insert into public.user_roles (id, tournament_id, user_id, role)
  values (gen_random_uuid(), v_tournament_id, auth.uid(), 'admin');

  return v_tournament_id;
end;
$$;

revoke all on function public.create_tournament_for_user(text, date) from public;
grant execute on function public.create_tournament_for_user(text, date) to authenticated;
;
