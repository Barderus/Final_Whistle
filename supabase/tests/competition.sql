grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function auth.jwt() to authenticated;
grant select on public.profiles to authenticated;
grant select on public.matches to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant select on public.leaderboard to authenticated;

begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000001',
  'participant@example.com',
  '{"display_name":"Alex"}'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000002',
  'second@example.com',
  '{"display_name":"Alex"}'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000003',
  'admin@example.com',
  '{"display_name":"Result Admin"}'
);

do $$
declare
  first_name text;
  second_name text;
  second_metadata_name text;
begin
  select display_name::text
  into first_name
  from public.profiles
  where id = '00000000-0000-0000-0000-000000000001';

  select display_name::text
  into second_name
  from public.profiles
  where id = '00000000-0000-0000-0000-000000000002';

  select raw_user_meta_data ->> 'display_name'
  into second_metadata_name
  from auth.users
  where id = '00000000-0000-0000-0000-000000000002';

  if first_name = second_name then
    raise exception 'Duplicate signup names were not resolved.';
  end if;

  if second_name <> second_metadata_name then
    raise exception 'Fallback display name was not synchronized.';
  end if;
end;
$$;

insert into public.matches (
  id,
  match_number,
  stage,
  start_time,
  location,
  team1,
  team2
)
values
  (
    'test-shared',
    1001,
    'Group Test',
    now() + interval '1 day',
    'Test Stadium',
    'Team A',
    'Team B'
  ),
  (
    'test-past',
    1002,
    'Group Test',
    now() - interval '1 day',
    'Test Stadium',
    'Team C',
    'Team D'
  ),
  (
    'test-future',
    1003,
    'Group Test',
    now() + interval '1 day',
    'Test Stadium',
    'Team E',
    'Team F'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003',
  true
);
select set_config(
  'request.jwt.claim.email',
  'admin@example.com',
  true
);

insert into public.predictions (
  user_id,
  match_id,
  team1_score,
  team2_score
)
values (
  '00000000-0000-0000-0000-000000000003',
  'test-shared',
  2,
  1
);

reset role;

update public.matches
set start_time = now() - interval '1 hour'
where id = 'test-shared';

insert into public.admin_emails (email)
values ('admin@example.com');

do $$
begin
  if not public.is_competition_excluded(
    '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'Admin account was not excluded from competition.';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003',
  true
);
select set_config(
  'request.jwt.claim.email',
  'admin@example.com',
  true
);

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.predictions (
      user_id,
      match_id,
      team1_score,
      team2_score
    )
    values (
      '00000000-0000-0000-0000-000000000003',
      'test-future',
      1,
      0
    );
  exception
    when others then
      if position(
        'not eligible to submit predictions' in sqlerrm
      ) > 0 then
        blocked := true;
      else
        raise;
      end if;
  end;

  if not blocked then
    raise exception 'Excluded admin prediction was accepted.';
  end if;
end;
$$;

do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.set_match_result(
      'test-future',
      'complete',
      1,
      0,
      null
    );
  exception
    when others then
      if position(
        'cannot start or complete before kickoff' in sqlerrm
      ) > 0 then
        blocked := true;
      else
        raise;
      end if;
  end;

  if not blocked then
    raise exception 'Future match completion was accepted.';
  end if;
end;
$$;

select public.set_match_result(
  'test-past',
  'complete',
  2,
  1,
  null
);

do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.set_match_result(
      'test-past',
      'complete',
      3,
      1,
      null
    );
  exception
    when others then
      if position(
        'requires a reason' in sqlerrm
      ) > 0 then
        blocked := true;
      else
        raise;
      end if;
  end;

  if not blocked then
    raise exception 'Completed result correction lacked a reason.';
  end if;
end;
$$;

select public.set_match_result(
  'test-past',
  'complete',
  3,
  1,
  'Official score correction'
);

reset role;

do $$
begin
  if (
    select count(*)
    from public.match_result_audit
    where match_id = 'test-past'
  ) <> 2 then
    raise exception 'Expected two audit rows for the completed match.';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claim.email',
  'participant@example.com',
  true
);

do $$
begin
  if exists (
    select 1
    from public.predictions
    where user_id = '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'Excluded admin prediction remained publicly visible.';
  end if;

  if exists (
    select 1
    from public.leaderboard
    where user_id = '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'Excluded admin remained on the leaderboard.';
  end if;
end;
$$;

rollback;
