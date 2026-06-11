create table public.admin_emails (
  email citext primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_emails
    where email::text = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.set_match_result(
  p_match_id text,
  p_status text,
  p_team1_score smallint default null,
  p_team2_score smallint default null
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
  updated_match public.matches;
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
  into updated_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  update public.matches
  set
    status = normalized_status,
    team1_score = normalized_team1_score,
    team2_score = normalized_team2_score
  where id = p_match_id
  returning * into updated_match;

  return updated_match;
end;
$$;

alter table public.admin_emails enable row level security;

revoke all on table public.admin_emails from public;
revoke all on table public.admin_emails from anon;
revoke all on table public.admin_emails from authenticated;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.set_match_result(text, text, smallint, smallint) from public;
revoke all on function public.set_match_result(text, text, smallint, smallint) from anon;
grant execute on function public.set_match_result(text, text, smallint, smallint) to authenticated;
