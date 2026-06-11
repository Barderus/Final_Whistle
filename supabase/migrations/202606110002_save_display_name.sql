create or replace function public.save_display_name(p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  saved_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must sign in to update your display name.';
  end if;

  normalized_name := trim(p_display_name);

  if char_length(normalized_name) < 2
    or char_length(normalized_name) > 30 then
    raise exception 'Display name must be between 2 and 30 characters.';
  end if;

  insert into public.profiles (id, display_name)
  values (auth.uid(), normalized_name)
  on conflict (id)
  do update set display_name = excluded.display_name
  returning * into saved_profile;

  return saved_profile;
end;
$$;

revoke all on function public.save_display_name(text) from public;
revoke all on function public.save_display_name(text) from anon;
grant execute on function public.save_display_name(text) to authenticated;
