-- Activación provisional de plantillas no EMEA para probar el Fantasy VCT 2027.
--
-- Estas filas NO se marcan como confirmadas. `source_url` permite distinguirlas
-- y sustituirlas cuando estén disponibles las plantillas oficiales de 2027.
-- Sólo se activan jugadores ya vinculados a uno de los 24 equipos confirmados
-- de Americas, Pacific o China.

WITH activated AS (
  UPDATE public.vct_season_players AS season_player
     SET roster_status = 'active',
         market_eligible = true,
         source_url = 'provisional:legacy-roster-2027',
         confirmed_at = NULL
    FROM public.vct_season_teams AS season_team
   WHERE season_player.season_year = 2027
     AND season_team.season_year = season_player.season_year
     AND season_team.team_id = season_player.team_id
     AND season_team.region IN ('AMERICAS', 'PACIFIC', 'CHINA')
     AND season_team.confirmation_status = 'confirmed'
     AND season_team.fantasy_eligible = true
     AND season_player.roster_status = 'inactive'
  RETURNING season_player.player_id
)
SELECT count(*)::integer AS provisional_players_activated
FROM activated;

-- Renovar únicamente el mercado de la liga de prueba y sólo si nadie ha pujado.
-- La plantilla inicial y el presupuesto no se modifican.
DO $$
DECLARE
  v_league_id uuid;
  v_cycle_id uuid;
BEGIN
  SELECT l.id
    INTO v_league_id
    FROM public.leagues l
    JOIN public.league_participants lp ON lp.league_id = l.id
    JOIN public.profiles p ON p.id = lp.profile_id
   WHERE lower(l.name) = lower('Luro3 Liga')
     AND lower(p.username) = lower('Luro3')
   ORDER BY l.created_at DESC
   LIMIT 1;

  IF v_league_id IS NULL THEN
    RETURN;
  END IF;

  SELECT cycle.id
    INTO v_cycle_id
    FROM public.market_cycles cycle
   WHERE cycle.league_id = v_league_id
     AND cycle.status = 'open'
     AND cycle.ends_at > now()
   ORDER BY cycle.created_at DESC
   LIMIT 1;

  IF v_cycle_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.user_bids bid
         JOIN public.market_auctions auction ON auction.id = bid.auction_id
        WHERE auction.cycle_id = v_cycle_id
     ) THEN
    DELETE FROM public.market_auctions auction
     WHERE auction.cycle_id = v_cycle_id;

    PERFORM public.ensure_vct_2027_market(v_league_id, 10);
  END IF;
END;
$$;

-- Debe devolver 40 Americas, 30 Pacific y 35 China con los datos provisionales
-- disponibles actualmente. EMEA conserva sus 37 jugadores ya confirmados.
SELECT
  lower(season_team.region) AS region,
  count(*) FILTER (WHERE season_player.market_eligible)::integer AS eligible_players,
  count(*)::integer AS registered_players
FROM public.vct_season_players season_player
JOIN public.vct_season_teams season_team
  ON season_team.season_year = season_player.season_year
 AND season_team.team_id = season_player.team_id
WHERE season_player.season_year = 2027
GROUP BY season_team.region
ORDER BY season_team.region;
