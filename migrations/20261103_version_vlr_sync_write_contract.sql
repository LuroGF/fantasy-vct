begin;

-- The VLR routes already depend on these columns and RPCs. Keep their
-- database contract versioned so a clean environment behaves like production.
alter table public.matches
  add column if not exists team_a_score integer,
  add column if not exists team_b_score integer,
  add column if not exists source text default 'manual',
  add column if not exists source_updated_at timestamp with time zone,
  add column if not exists manual_override boolean default false;

alter table public.player_performances
  add column if not exists source text default 'manual',
  add column if not exists source_updated_at timestamp with time zone,
  add column if not exists manual_override boolean default false;

update public.matches
set source = 'manual'
where source is null;

update public.player_performances
set source = 'manual'
where source is null;

drop function if exists public.upsert_vlr_match(
  text,
  text,
  text,
  timestamp with time zone,
  text,
  integer,
  integer,
  integer
);

create function public.upsert_vlr_match(
  p_vlr_id text,
  p_team_a_vlr_id text,
  p_team_b_vlr_id text,
  p_match_date timestamp with time zone,
  p_status text default 'upcoming',
  p_team_a_score integer default null,
  p_team_b_score integer default null,
  p_gameweek_id integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_a uuid;
  v_team_b uuid;
  v_status text := lower(coalesce(nullif(trim(p_status), ''), 'upcoming'));
begin
  if nullif(trim(p_vlr_id), '') is null then
    raise exception 'VLR match id is required';
  end if;

  if p_match_date is null then
    raise exception 'Match date is required';
  end if;

  if v_status not in ('upcoming', 'live', 'finished', 'completed') then
    raise exception 'Unsupported match status: %', v_status;
  end if;

  select team.id
    into v_team_a
    from public.pro_teams team
   where team.vlr_id = trim(p_team_a_vlr_id)
   limit 1;

  select team.id
    into v_team_b
    from public.pro_teams team
   where team.vlr_id = trim(p_team_b_vlr_id)
   limit 1;

  if v_team_a is null or v_team_b is null then
    raise exception 'Both VLR teams must be mapped before syncing a match';
  end if;

  if v_team_a = v_team_b then
    raise exception 'A team cannot play against itself';
  end if;

  insert into public.matches (
    vlr_id,
    team_a,
    team_b,
    match_date,
    status,
    team_a_score,
    team_b_score,
    gameweek_id,
    source,
    source_updated_at,
    manual_override
  ) values (
    trim(p_vlr_id),
    v_team_a,
    v_team_b,
    p_match_date,
    v_status,
    p_team_a_score,
    p_team_b_score,
    p_gameweek_id,
    'vlr',
    now(),
    false
  )
  on conflict (vlr_id) do update
  set team_a = excluded.team_a,
      team_b = excluded.team_b,
      match_date = excluded.match_date,
      status = excluded.status,
      team_a_score = excluded.team_a_score,
      team_b_score = excluded.team_b_score,
      gameweek_id = excluded.gameweek_id,
      source = 'vlr',
      source_updated_at = now()
  where coalesce(public.matches.manual_override, false) = false;
end;
$$;

drop function if exists public.upsert_vlr_player_performance(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  boolean
);

create function public.upsert_vlr_player_performance(
  p_match_id uuid,
  p_player_id uuid,
  p_map_name text,
  p_agent_name text default null,
  p_kills integer default 0,
  p_deaths integer default 0,
  p_assists integer default 0,
  p_clutches integer default 0,
  p_fb integer default 0,
  p_fd integer default 0,
  p_acs integer default 0,
  p_mvp boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_map_name text := nullif(trim(p_map_name), '');
begin
  if v_map_name is null then
    raise exception 'Map name is required';
  end if;

  if least(
    coalesce(p_kills, 0),
    coalesce(p_deaths, 0),
    coalesce(p_assists, 0),
    coalesce(p_clutches, 0),
    coalesce(p_fb, 0),
    coalesce(p_fd, 0),
    coalesce(p_acs, 0)
  ) < 0 then
    raise exception 'Performance statistics cannot be negative';
  end if;

  insert into public.player_performances (
    match_id,
    player_id,
    map_name,
    agent_name,
    kills,
    deaths,
    assists,
    clutches,
    fb,
    fd,
    acs,
    mvp,
    source,
    source_updated_at,
    manual_override
  ) values (
    p_match_id,
    p_player_id,
    v_map_name,
    nullif(trim(p_agent_name), ''),
    coalesce(p_kills, 0),
    coalesce(p_deaths, 0),
    coalesce(p_assists, 0),
    coalesce(p_clutches, 0),
    coalesce(p_fb, 0),
    coalesce(p_fd, 0),
    coalesce(p_acs, 0),
    coalesce(p_mvp, false),
    'vlr',
    now(),
    false
  )
  on conflict (match_id, player_id, map_name) do update
  set agent_name = excluded.agent_name,
      kills = excluded.kills,
      deaths = excluded.deaths,
      assists = excluded.assists,
      clutches = excluded.clutches,
      fb = excluded.fb,
      fd = excluded.fd,
      acs = excluded.acs,
      mvp = excluded.mvp,
      source = 'vlr',
      source_updated_at = now()
  where coalesce(public.player_performances.manual_override, false) = false;
end;
$$;

revoke all on function public.upsert_vlr_match(
  text, text, text, timestamp with time zone, text, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.upsert_vlr_match(
  text, text, text, timestamp with time zone, text, integer, integer, integer
) to service_role;

revoke all on function public.upsert_vlr_player_performance(
  uuid, uuid, text, text, integer, integer, integer, integer, integer,
  integer, integer, boolean
) from public, anon, authenticated;
grant execute on function public.upsert_vlr_player_performance(
  uuid, uuid, text, text, integer, integer, integer, integer, integer,
  integer, integer, boolean
) to service_role;

comment on function public.upsert_vlr_match(
  text, text, text, timestamp with time zone, text, integer, integer, integer
) is 'Idempotently stores one VLR match while preserving manual overrides.';

comment on function public.upsert_vlr_player_performance(
  uuid, uuid, text, text, integer, integer, integer, integer, integer,
  integer, integer, boolean
) is 'Idempotently stores one player map performance and triggers fantasy scoring.';

commit;
