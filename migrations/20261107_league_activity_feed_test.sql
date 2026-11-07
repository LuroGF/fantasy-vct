-- Run after 20261108_activity_transfer_classification.sql.
-- Creates a complete activity scenario and rolls every change back.

begin;

create temporary table activity_test_context (
  league_id uuid,
  creator_id uuid,
  member_id uuid,
  player_id uuid
) on commit drop;

do $$
declare
  v_league_id uuid := extensions.uuid_generate_v4();
  v_creator_id uuid;
  v_member_id uuid;
  v_player_id uuid;
begin
  select id into v_creator_id from public.profiles order by created_at nulls last, id limit 1;
  select id into v_member_id from public.profiles where id <> v_creator_id order by created_at nulls last, id limit 1;
  select id into v_player_id from public.pro_players order by id limit 1;

  if v_creator_id is null or v_member_id is null or v_player_id is null then
    raise exception 'The test requires at least two profiles and one professional player';
  end if;

  insert into activity_test_context values (v_league_id, v_creator_id, v_member_id, v_player_id);

  insert into public.leagues (id, name, invite_code, creator_id, max_participants, budget_limit)
  values (v_league_id, '__activity_test__', 'ACT' || substr(replace(v_league_id::text, '-', ''), 1, 7), v_creator_id, 10, 50000000);

  insert into public.league_participants (league_id, profile_id, current_budget)
  values
    (v_league_id, v_creator_id, 50000000),
    (v_league_id, v_member_id, 50000000);

  insert into public.user_rosters (
    league_id, profile_id, player_id, acquisition_price, is_active, is_starter, slot_type, release_clause
  ) values (
    v_league_id, v_member_id, v_player_id, 10000000, true, false, 'substitute', 15000000
  );

  delete from public.user_rosters
  where league_id = v_league_id and profile_id = v_member_id and player_id = v_player_id;

  insert into public.user_rosters (
    league_id, profile_id, player_id, acquisition_price, is_active, is_starter, slot_type, release_clause
  ) values (
    v_league_id, v_creator_id, v_player_id, 15000000, true, false, 'substitute', 22500000
  );

  delete from public.league_participants
  where league_id = v_league_id and profile_id = v_member_id;
end;
$$;

do $$
declare
  v_context activity_test_context%rowtype;
  v_clause record;
begin
  select * into v_context from activity_test_context limit 1;

  if (select count(*) from public.league_activity_events where league_id = v_context.league_id and event_type = 'league_created') <> 1 then
    raise exception 'league_created event was not recorded exactly once';
  end if;

  if (select count(*) from public.league_activity_events where league_id = v_context.league_id and event_type = 'member_joined' and actor_profile_id = v_context.member_id) <> 1 then
    raise exception 'member_joined event was not recorded exactly once';
  end if;

  if (select count(*) from public.league_activity_events where league_id = v_context.league_id and event_type = 'member_left' and actor_profile_id = v_context.member_id) <> 1 then
    raise exception 'member_left event was not recorded exactly once';
  end if;

  select * into v_clause
  from public.league_activity_events
  where league_id = v_context.league_id and event_type = 'release_clause';

  if v_clause.id is null
    or v_clause.actor_profile_id <> v_context.creator_id
    or v_clause.target_profile_id <> v_context.member_id
    or v_clause.player_id <> v_context.player_id
    or v_clause.amount <> 15000000 then
    raise exception 'release_clause event does not preserve actor, target, player and amount';
  end if;

  if (select count(*) from public.league_activity_events where league_id = v_context.league_id) <> 4 then
    raise exception 'Unexpected duplicate activity events were recorded';
  end if;
end;
$$;

select jsonb_build_object(
  'status', 'passed',
  'persistence', 'none: transaction rolled back below',
  'league_created', true,
  'member_joined', true,
  'release_clause_correlated', true,
  'member_left', true,
  'duplicates', false
) as test_result;

rollback;
