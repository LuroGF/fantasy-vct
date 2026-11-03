-- Reversible end-to-end test for both VLR write RPCs and the scoring trigger.
-- Every write is rolled back at the end.

begin;

create temp table _vlr_sync_test_context on commit drop as
select
  gen_random_uuid() AS match_id,
  '__vlr_sync_rollback_' || replace(gen_random_uuid()::text, '-', '') AS vlr_id,
  team_a.id AS team_a_id,
  team_a.vlr_id AS team_a_vlr_id,
  team_b.id AS team_b_id,
  team_b.vlr_id AS team_b_vlr_id,
  team_a.player_id
from lateral (
  select team.id, team.vlr_id, player.id AS player_id
  from public.pro_teams team
  join public.pro_players player on player.team_id = team.id
  where team.vlr_id is not null
  order by team.id, player.id
  limit 1
) team_a
cross join lateral (
  select id, vlr_id
  from public.pro_teams
  where vlr_id is not null
    and id <> team_a.id
  order by id
  limit 1
) team_b;

do $$
begin
  if (select count(*) from _vlr_sync_test_context) <> 1 then
    raise exception 'TEST FAILED: two mapped teams and one mapped player are required';
  end if;
end;
$$;

select public.upsert_vlr_match(
  p_vlr_id := context.vlr_id,
  p_team_a_vlr_id := context.team_a_vlr_id,
  p_team_b_vlr_id := context.team_b_vlr_id,
  p_match_date := now(),
  p_status := 'live',
  p_team_a_score := 1,
  p_team_b_score := 0,
  p_gameweek_id := null
)
from _vlr_sync_test_context context;

update _vlr_sync_test_context context
set match_id = match.id
from public.matches match
where match.vlr_id = context.vlr_id;

select public.upsert_vlr_player_performance(
  p_match_id := context.match_id,
  p_player_id := context.player_id,
  p_map_name := 'Rollback Test Map',
  p_agent_name := 'Sova',
  p_kills := 10,
  p_deaths := 10,
  p_assists := 0,
  p_clutches := 0,
  p_fb := 0,
  p_fd := 0,
  p_acs := 150,
  p_mvp := false
)
from _vlr_sync_test_context context;

-- A second call must update the same rows, not duplicate them.
select public.upsert_vlr_match(
  p_vlr_id := context.vlr_id,
  p_team_a_vlr_id := context.team_a_vlr_id,
  p_team_b_vlr_id := context.team_b_vlr_id,
  p_match_date := now(),
  p_status := 'completed',
  p_team_a_score := 2,
  p_team_b_score := 0,
  p_gameweek_id := null
)
from _vlr_sync_test_context context;

select public.upsert_vlr_player_performance(
  p_match_id := context.match_id,
  p_player_id := context.player_id,
  p_map_name := 'Rollback Test Map',
  p_agent_name := 'Sova',
  p_kills := 20,
  p_deaths := 10,
  p_assists := 5,
  p_clutches := 0,
  p_fb := 3,
  p_fd := 2,
  p_acs := 250,
  p_mvp := false
)
from _vlr_sync_test_context context;

do $$
declare
  v_context _vlr_sync_test_context%rowtype;
  v_match_count integer;
  v_performance_count integer;
  v_points integer;
begin
  select * into v_context from _vlr_sync_test_context;

  select count(*) into v_match_count
  from public.matches
  where vlr_id = v_context.vlr_id
    and status = 'completed'
    and team_a_score = 2
    and team_b_score = 0
    and source = 'vlr';

  select count(*), max(fantasy_points)
    into v_performance_count, v_points
  from public.player_performances
  where match_id = v_context.match_id
    and player_id = v_context.player_id
    and map_name = 'Rollback Test Map'
    and source = 'vlr';

  if v_match_count <> 1 then
    raise exception 'TEST FAILED: VLR match upsert is not idempotent';
  end if;

  if v_performance_count <> 1 then
    raise exception 'TEST FAILED: VLR performance upsert is not idempotent';
  end if;

  if v_points <> 42 then
    raise exception 'TEST FAILED: expected 42 fantasy points, found %', v_points;
  end if;
end;
$$;

select jsonb_build_object(
  'status', 'passed',
  'match_upserted_once', true,
  'performance_upserted_once', true,
  'fantasy_points', 42,
  'persistence', 'none: transaction rolled back'
) AS test_result;

rollback;
