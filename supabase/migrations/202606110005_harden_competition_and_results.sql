create table public.competition_exclusions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint competition_exclusions_reason
    check (char_length(trim(reason)) between 2 and 100)
);

create table public.match_result_audit (
  id bigint generated always as identity primary key,
  match_id text not null references public.matches(id),
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_email citext not null,
  previous_status text not null,
  previous_team1_score smallint,
  previous_team2_score smallint,
  new_status text not null,
  new_team1_score smallint,
  new_team2_score smallint,
  change_reason text,
  changed_at timestamptz not null default now(),
  constraint match_result_audit_change_reason
    check (
      change_reason is null
      or char_length(change_reason) between 5 and 500
    )
);

create index match_result_audit_match_id_idx
on public.match_result_audit(match_id, changed_at desc);

create or replace function public.is_competition_excluded(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.competition_exclusions
    where user_id = p_user_id
  );
$$;

create or replace function public.exclude_admin_from_competition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.competition_exclusions (user_id, reason)
  select auth.users.id, 'Admin account'
  from auth.users
  join public.profiles on public.profiles.id = auth.users.id
  where lower(auth.users.email) = lower(new.email::text)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger admin_emails_exclude_from_competition
after insert or update of email on public.admin_emails
for each row execute function public.exclude_admin_from_competition();

insert into public.competition_exclusions (user_id, reason)
select auth.users.id, 'Admin account'
from auth.users
join public.profiles on public.profiles.id = auth.users.id
join public.admin_emails
  on lower(public.admin_emails.email::text) = lower(auth.users.email)
on conflict (user_id) do nothing;

create or replace function public.prepare_new_user_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  fallback_name text;
begin
  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if char_length(requested_name) < 2
    or char_length(requested_name) > 30 then
    requested_name := 'Player ' || left(new.id::text, 8);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(lower(requested_name))
  );

  if exists (
    select 1
    from public.profiles
    where display_name = requested_name
  ) then
    fallback_name :=
      left(requested_name, 21) || ' ' || left(new.id::text, 8);

    if exists (
      select 1
      from public.profiles
      where display_name = fallback_name
    ) then
      fallback_name := 'Player ' || left(md5(new.id::text), 23);
    end if;

    requested_name := fallback_name;
  end if;

  new.raw_user_meta_data :=
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('display_name', requested_name);

  return new;
end;
$$;

create trigger prepare_auth_user_display_name
before insert on auth.users
for each row execute function public.prepare_new_user_display_name();

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

  insert into public.profiles (id, display_name)
  values (new.id, requested_name);

  if exists (
    select 1
    from public.admin_emails
    where lower(email::text) = lower(coalesce(new.email, ''))
  ) then
    insert into public.competition_exclusions (user_id, reason)
    values (new.id, 'Admin account')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

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

  if public.is_competition_excluded(new.user_id) then
    raise exception 'This account is not eligible to submit predictions.';
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

alter policy "Users can read allowed predictions"
on public.predictions
using (
  user_id = (select auth.uid())
  or (
    not public.is_competition_excluded(user_id)
    and exists (
      select 1
      from public.matches
      where matches.id = predictions.match_id
        and matches.start_time <= now()
    )
  )
);

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
where not public.is_competition_excluded(profiles.id)
group by profiles.id, profiles.display_name;

create function public.set_match_result(
  p_match_id text,
  p_status text,
  p_team1_score smallint,
  p_team2_score smallint,
  p_change_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_status text := lower(trim(coalesce(p_status, '')));
  normalized_team1_score smallint := p_team1_score;
  normalized_team2_score smallint := p_team2_score;
  normalized_change_reason text := nullif(trim(p_change_reason), '');
  selected_match public.matches;
  updated_match public.matches;
  result_changed boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have permission to update match results.';
  end if;

  if normalized_status not in ('scheduled', 'in_progress', 'complete') then
    raise exception 'Invalid match status.';
  end if;

  if normalized_status = 'scheduled' then
    normalized_team1_score := null;
    normalized_team2_score := null;
  elsif normalized_status = 'in_progress' then
    if (normalized_team1_score is null) <> (normalized_team2_score is null) then
      raise exception 'Provide both scores or leave both blank.';
    end if;
  elsif normalized_status = 'complete' then
    if normalized_team1_score is null or normalized_team2_score is null then
      raise exception 'Completed matches require both scores.';
    end if;
  end if;

  select *
  into selected_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  if normalized_status in ('in_progress', 'complete')
    and selected_match.start_time > now() then
    raise exception 'A match cannot start or complete before kickoff.';
  end if;

  result_changed :=
    selected_match.status is distinct from normalized_status
    or selected_match.team1_score is distinct from normalized_team1_score
    or selected_match.team2_score is distinct from normalized_team2_score;

  if not result_changed then
    return selected_match;
  end if;

  if selected_match.status = 'complete'
    and (
      normalized_change_reason is null
      or char_length(normalized_change_reason) < 5
    ) then
    raise exception 'Correcting a completed result requires a reason.';
  end if;

  if normalized_change_reason is not null
    and char_length(normalized_change_reason) > 500 then
    raise exception 'Correction reason must be 500 characters or fewer.';
  end if;

  update public.matches
  set
    status = normalized_status,
    team1_score = normalized_team1_score,
    team2_score = normalized_team2_score
  where id = p_match_id
  returning * into updated_match;

  insert into public.match_result_audit (
    match_id,
    changed_by,
    changed_by_email,
    previous_status,
    previous_team1_score,
    previous_team2_score,
    new_status,
    new_team1_score,
    new_team2_score,
    change_reason
  )
  values (
    p_match_id,
    auth.uid(),
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    selected_match.status,
    selected_match.team1_score,
    selected_match.team2_score,
    updated_match.status,
    updated_match.team1_score,
    updated_match.team2_score,
    normalized_change_reason
  );

  return updated_match;
end;
$$;

create or replace function public.set_match_result(
  p_match_id text,
  p_status text,
  p_team1_score smallint default null,
  p_team2_score smallint default null
)
returns public.matches
language sql
security definer
set search_path = ''
as $$
  select public.set_match_result(
    p_match_id,
    p_status,
    p_team1_score,
    p_team2_score,
    null
  );
$$;

alter table public.competition_exclusions enable row level security;
alter table public.match_result_audit enable row level security;

create policy "Admins can read match result audit"
on public.match_result_audit
for select
to authenticated
using (public.is_admin());

revoke all on table public.competition_exclusions from public;
revoke all on table public.competition_exclusions from anon;
revoke all on table public.competition_exclusions from authenticated;

revoke all on table public.match_result_audit from public;
revoke all on table public.match_result_audit from anon;
revoke all on table public.match_result_audit from authenticated;
grant select on table public.match_result_audit to authenticated;

revoke all on function public.is_competition_excluded(uuid) from public;
revoke all on function public.is_competition_excluded(uuid) from anon;
grant execute on function public.is_competition_excluded(uuid) to authenticated;

revoke all on function public.exclude_admin_from_competition() from public;
revoke all on function public.prepare_new_user_display_name() from public;

revoke all on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text
) from public;
revoke all on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text
) from anon;
grant execute on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text
) to authenticated;

grant select on public.leaderboard to authenticated;
