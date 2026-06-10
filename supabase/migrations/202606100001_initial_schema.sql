create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name citext not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(trim(display_name::text)) between 2 and 30),
  constraint profiles_display_name_trimmed
    check (display_name::text = trim(display_name::text))
);

create table public.matches (
  id text primary key,
  match_number integer not null unique,
  stage text not null,
  start_time timestamptz not null,
  location text not null,
  team1 text not null,
  team2 text not null,
  team1_score smallint,
  team2_score smallint,
  status text not null default 'scheduled',
  updated_at timestamptz not null default now(),
  constraint matches_status
    check (status in ('scheduled', 'in_progress', 'complete')),
  constraint matches_team1_score
    check (team1_score is null or team1_score between 0 and 99),
  constraint matches_team2_score
    check (team2_score is null or team2_score between 0 and 99),
  constraint matches_complete_score
    check (
      status <> 'complete'
      or (team1_score is not null and team2_score is not null)
    )
);

create table public.predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  team1_score smallint not null,
  team2_score smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id),
  constraint predictions_team1_score check (team1_score between 0 and 99),
  constraint predictions_team2_score check (team2_score between 0 and 99)
);

create index matches_start_time_idx on public.matches(start_time);
create index predictions_match_id_idx on public.predictions(match_id);

create or replace function public.is_placeholder_team(team_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    team_name ~* '^(UEFA|FIFA)[[:space:]]+[[:alnum:]]+$'
    or team_name ~* '^(W|L)[[:digit:]]+$'
    or team_name ~* '^[[:digit:]][A-L]+$';
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if char_length(requested_name) < 2 then
    requested_name := 'Player ' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, requested_name);

  return new;
exception
  when unique_violation then
    insert into public.profiles (id, display_name)
    values (new.id, requested_name || ' ' || left(new.id::text, 4));
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.validate_prediction_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  selected_match public.matches;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'You can only save your own prediction.';
  end if;

  select *
  into selected_match
  from public.matches
  where id = new.match_id;

  if not found then
    raise exception 'Match not found.';
  end if;

  if selected_match.start_time <= now() then
    raise exception 'This prediction is locked because the match has started.';
  end if;

  if public.is_placeholder_team(selected_match.team1)
    or public.is_placeholder_team(selected_match.team2) then
    raise exception 'Predictions open when both teams are confirmed.';
  end if;

  return new;
end;
$$;

create trigger predictions_validate_write
before insert or update on public.predictions
for each row execute function public.validate_prediction_write();

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can read matches"
on public.matches
for select
to authenticated
using (true);

create policy "Users can read allowed predictions"
on public.predictions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.matches
    where matches.id = predictions.match_id
      and matches.start_time <= now()
  )
);

create policy "Users can insert their own predictions"
on public.predictions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own predictions"
on public.predictions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.save_prediction(
  p_match_id text,
  p_team1_score smallint,
  p_team2_score smallint
)
returns public.predictions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_prediction public.predictions;
begin
  if auth.uid() is null then
    raise exception 'You must sign in to save a prediction.';
  end if;

  insert into public.predictions (
    user_id,
    match_id,
    team1_score,
    team2_score
  )
  values (
    auth.uid(),
    p_match_id,
    p_team1_score,
    p_team2_score
  )
  on conflict (user_id, match_id)
  do update set
    team1_score = excluded.team1_score,
    team2_score = excluded.team2_score
  returning * into saved_prediction;

  return saved_prediction;
end;
$$;

create or replace function public.get_server_time()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

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
      case
        when matches.status <> 'complete' then 0
        when predictions.team1_score = matches.team1_score
          and predictions.team2_score = matches.team2_score then 3
        when sign(predictions.team1_score - predictions.team2_score)
          = sign(matches.team1_score - matches.team2_score) then 1
        else 0
      end
    ),
    0
  )::integer as points
from public.profiles
left join public.predictions on predictions.user_id = profiles.id
left join public.matches on matches.id = predictions.match_id
group by profiles.id, profiles.display_name;

grant execute on function public.save_prediction(text, smallint, smallint)
to authenticated;
grant execute on function public.get_server_time() to authenticated;
grant select on public.leaderboard to authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.validate_prediction_write() from public;
revoke all on function public.set_updated_at() from public;
