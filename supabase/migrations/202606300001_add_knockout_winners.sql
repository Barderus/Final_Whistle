alter table public.matches
add column if not exists winner_team text;

alter table public.match_result_audit
add column if not exists previous_winner_team text,
add column if not exists new_winner_team text;

alter table public.matches
drop constraint if exists matches_winner_team,
add constraint matches_winner_team
  check (
    winner_team is null
    or winner_team in (team1, team2)
  );

alter table public.matches
drop constraint if exists matches_knockout_tie_winner,
add constraint matches_knockout_tie_winner
  check (
    status <> 'complete'
    or stage ~* '^Group '
    or team1_score is null
    or team2_score is null
    or team1_score <> team2_score
    or winner_team is not null
  ) not valid;

create or replace function public.prediction_points(
  p_predicted_team1_score smallint,
  p_predicted_team2_score smallint,
  p_actual_team1_score smallint,
  p_actual_team2_score smallint,
  p_match_status text,
  p_actual_winner_side smallint default null
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
      = coalesce(
        p_actual_winner_side,
        sign(p_actual_team1_score - p_actual_team2_score)
      ) then 1
    else 0
  end;
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
      public.prediction_points(
        predictions.team1_score,
        predictions.team2_score,
        matches.team1_score,
        matches.team2_score,
        matches.status,
        case
          when matches.winner_team = matches.team1 then 1::smallint
          when matches.winner_team = matches.team2 then (-1)::smallint
          else null
        end
      )
    ),
    0
  )::integer as points
from public.profiles
left join public.predictions on predictions.user_id = profiles.id
left join public.matches on matches.id = predictions.match_id
where not public.is_competition_excluded(profiles.id)
group by profiles.id, profiles.display_name;

create or replace function public.set_match_result(
  p_match_id text,
  p_status text,
  p_team1_score smallint,
  p_team2_score smallint,
  p_winner_team text,
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
  normalized_winner_team text := nullif(trim(p_winner_team), '');
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

  select *
  into selected_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  if normalized_status = 'scheduled' then
    normalized_team1_score := null;
    normalized_team2_score := null;
    normalized_winner_team := null;
  elsif normalized_status = 'in_progress' then
    normalized_winner_team := null;

    if (normalized_team1_score is null) <> (normalized_team2_score is null) then
      raise exception 'Provide both scores or leave both blank.';
    end if;
  elsif normalized_status = 'complete' then
    if normalized_team1_score is null or normalized_team2_score is null then
      raise exception 'Completed matches require both scores.';
    end if;

    if selected_match.stage ~* '^Group '
      or normalized_team1_score <> normalized_team2_score then
      normalized_winner_team := null;
    elsif normalized_winner_team is null then
      raise exception 'Completed knockout ties require an advancing team.';
    elsif normalized_winner_team not in (
      selected_match.team1,
      selected_match.team2
    ) then
      raise exception 'Advancing team must be one of the match teams.';
    end if;
  end if;

  if normalized_status in ('in_progress', 'complete')
    and selected_match.start_time > now() then
    raise exception 'A match cannot start or complete before kickoff.';
  end if;

  result_changed :=
    selected_match.status is distinct from normalized_status
    or selected_match.team1_score is distinct from normalized_team1_score
    or selected_match.team2_score is distinct from normalized_team2_score
    or selected_match.winner_team is distinct from normalized_winner_team;

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
    team2_score = normalized_team2_score,
    winner_team = normalized_winner_team
  where id = p_match_id
  returning * into updated_match;

  insert into public.match_result_audit (
    match_id,
    changed_by,
    changed_by_email,
    previous_status,
    previous_team1_score,
    previous_team2_score,
    previous_winner_team,
    new_status,
    new_team1_score,
    new_team2_score,
    new_winner_team,
    change_reason
  )
  values (
    p_match_id,
    auth.uid(),
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    selected_match.status,
    selected_match.team1_score,
    selected_match.team2_score,
    selected_match.winner_team,
    updated_match.status,
    updated_match.team1_score,
    updated_match.team2_score,
    updated_match.winner_team,
    normalized_change_reason
  );

  return updated_match;
end;
$$;

create or replace function public.set_match_result(
  p_match_id text,
  p_status text,
  p_team1_score smallint,
  p_team2_score smallint,
  p_change_reason text
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
    null,
    p_change_reason
  );
$$;

revoke all on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  smallint
) from public;
revoke all on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  smallint
) from anon;
grant execute on function public.prediction_points(
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  smallint
) to authenticated;

revoke all on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text,
  text
) from public;
revoke all on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text,
  text
) from anon;
grant execute on function public.set_match_result(
  text,
  text,
  smallint,
  smallint,
  text,
  text
) to authenticated;

grant select on public.leaderboard to authenticated;
