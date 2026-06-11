create or replace function public.prediction_points(
  p_predicted_team1_score smallint,
  p_predicted_team2_score smallint,
  p_actual_team1_score smallint,
  p_actual_team2_score smallint,
  p_match_status text
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_match_status <> 'complete' then 0
    when p_predicted_team1_score = p_actual_team1_score
      and p_predicted_team2_score = p_actual_team2_score then 3
    when sign(p_predicted_team1_score - p_predicted_team2_score)
      = sign(p_actual_team1_score - p_actual_team2_score) then 1
    else 0
  end;
$$;

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    join public.admin_emails
      on lower(public.admin_emails.email::text) = lower(auth.users.email)
    where auth.users.id = p_user_id
  );
$$;

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

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('display_name', normalized_name),
    updated_at = now()
  where id = auth.uid();

  return saved_profile;
end;
$$;

update auth.users
set raw_user_meta_data =
  coalesce(auth.users.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('display_name', profiles.display_name::text),
  updated_at = now()
from public.profiles
where profiles.id = auth.users.id;

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.display_name,
  count(predictions.match_id) filter (
    where matches.status = 'complete'
  )::integer as scored_predictions,
  count(predictions.match_id) filter (
    where matches.status = 'complete'
      and predictions.team1_score = matches.team1_score
      and predictions.team2_score = matches.team2_score
  )::integer as exact_scores,
  coalesce(
    sum(
      public.prediction_points(
        predictions.team1_score,
        predictions.team2_score,
        matches.team1_score,
        matches.team2_score,
        matches.status
      )
    ),
    0
  )::integer as points
from public.profiles
left join public.predictions on predictions.user_id = profiles.id
left join public.matches on matches.id = predictions.match_id
where not public.is_admin_user(profiles.id)
group by profiles.id, profiles.display_name;

revoke all on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text
) from public;
revoke all on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text
) from anon;
grant execute on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text
) to authenticated;

revoke all on function public.is_admin_user(uuid) from public;
revoke all on function public.is_admin_user(uuid) from anon;
grant execute on function public.is_admin_user(uuid) to authenticated;

revoke all on function public.save_display_name(text) from public;
revoke all on function public.save_display_name(text) from anon;
grant execute on function public.save_display_name(text) to authenticated;

grant select on public.leaderboard to authenticated;
