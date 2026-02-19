-- 11. CALCULATE GAMEWEEK SCORES
create or replace function calculate_gameweek_scores(p_gameweek_id integer)
returns void as $$
declare
  gw_start timestamp with time zone;
  gw_end timestamp with time zone;
begin
  -- Get gameweek dates
  select start_date, end_date into gw_start, gw_end
  from public.gameweeks
  where id = p_gameweek_id;

  if not found then
    raise exception 'Gameweek % not found', p_gameweek_id;
  end if;

  -- Insert or Update participant_scores_history
  -- Logic:
  -- 1. Identificar matches en el gameweek
  -- 2. Identificar rosters activos
  -- 3. Sumar puntos de los jugadores en esos matches
  
  insert into public.participant_scores_history (league_id, profile_id, gameweek_id, points_earned)
  select 
    ur.league_id,
    ur.profile_id,
    p_gameweek_id,
    coalesce(sum(pp.fantasy_points), 0) as points
  from public.user_rosters ur
  join public.matches m on m.created_at >= gw_start and m.created_at <= gw_end -- Assuming match date inside gameweek
  join public.player_performances pp on pp.match_id = m.id and pp.player_id = ur.player_id
  where ur.is_active = true -- Simplificacion: roster activo actual
  group by ur.league_id, ur.profile_id
  on conflict (league_id, profile_id, gameweek_id)
  do update set points_earned = excluded.points_earned;

  -- Update Ranks (Window function handled in view or separate update?)
  -- Simple update for rank within league
  with ranks as (
    select 
      league_id, 
      profile_id, 
      gameweek_id,
      rank() over (partition by league_id order by points_earned desc) as rnk
    from public.participant_scores_history
    where gameweek_id = p_gameweek_id
  )
  update public.participant_scores_history psh
  set rank_in_league = r.rnk
  from ranks r
  where psh.league_id = r.league_id 
    and psh.profile_id = r.profile_id 
    and psh.gameweek_id = r.gameweek_id;

end;
$$ language plpgsql;
