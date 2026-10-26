-- Keep the live market restricted to the configured VCT 2027 partner teams
-- and their active/substitute/benched seasonal players, even while the
-- season remains in draft for testing.

CREATE OR REPLACE FUNCTION public.is_vct_2027_market_eligible(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vct_season_players season_player
    JOIN public.vct_season_teams season_team
      ON season_team.season_year = season_player.season_year
     AND season_team.team_id = season_player.team_id
    JOIN public.pro_players player
      ON player.id = season_player.player_id
     AND player.team_id = season_player.team_id
    WHERE season_player.season_year = 2027
      AND season_player.player_id = p_player_id
      AND season_player.market_eligible = true
      AND season_player.roster_status IN ('active', 'substitute', 'benched')
      AND season_team.confirmation_status = 'confirmed'
      AND season_team.fantasy_eligible = true
      AND COALESCE(player.is_legend, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_vct_2027_market_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_status text;
  v_ends_at timestamptz;
BEGIN
  SELECT auction.player_id, auction.status, auction.ends_at
  INTO v_player_id, v_status, v_ends_at
  FROM public.market_auctions auction
  WHERE auction.id = NEW.auction_id;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF v_status <> 'open' OR v_ends_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Auction is not open';
  END IF;

  IF NOT public.is_vct_2027_market_eligible(v_player_id) THEN
    RAISE EXCEPTION 'Player is not eligible for the VCT 2027 market';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_vct_2027_market_bid ON public.user_bids;
CREATE TRIGGER guard_vct_2027_market_bid
BEFORE INSERT OR UPDATE OF auction_id, amount ON public.user_bids
FOR EACH ROW
EXECUTE FUNCTION public.guard_vct_2027_market_bid();

CREATE OR REPLACE FUNCTION public.ensure_vct_2027_market(
  p_league_id uuid,
  p_players_target integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_market_date date := (clock_timestamp() AT TIME ZONE 'Europe/Madrid')::date;
  v_cycle_id uuid;
  v_ends_at timestamptz;
  v_current_count integer;
  v_missing integer;
  v_removed integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.leagues league WHERE league.id = p_league_id) THEN
    RAISE EXCEPTION 'League not found';
  END IF;

  SELECT cycle.id, cycle.ends_at
  INTO v_cycle_id, v_ends_at
  FROM public.market_cycles cycle
  WHERE cycle.league_id = p_league_id
    AND cycle.status = 'open'
    AND cycle.ends_at > v_now
  ORDER BY cycle.created_at DESC
  LIMIT 1;

  IF v_cycle_id IS NULL THEN
    v_ends_at := v_now + interval '24 hours';

    INSERT INTO public.market_cycles (
      league_id,
      market_date,
      starts_at,
      ends_at,
      players_target,
      status
    )
    VALUES (
      p_league_id,
      v_market_date,
      v_now,
      v_ends_at,
      p_players_target,
      'open'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cycle_id;

    IF v_cycle_id IS NULL THEN
      SELECT cycle.id, cycle.ends_at
      INTO v_cycle_id, v_ends_at
      FROM public.market_cycles cycle
      WHERE cycle.league_id = p_league_id
        AND cycle.market_date = v_market_date
        AND cycle.status = 'open'
        AND cycle.ends_at > v_now
      LIMIT 1;
    END IF;
  END IF;

  IF v_cycle_id IS NULL THEN
    RETURN jsonb_build_object(
      'created', false,
      'reason', 'market_already_closed_for_date',
      'market_date', v_market_date
    );
  END IF;

  -- Invalid auctions without bids can be replaced safely. Auctions with an
  -- existing bid are retained for audit and must finish under the rules that
  -- were valid when the bid was accepted.
  WITH removed AS (
    DELETE FROM public.market_auctions auction
    WHERE auction.cycle_id = v_cycle_id
      AND auction.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_bids bid WHERE bid.auction_id = auction.id
      )
      AND (
        NOT public.is_vct_2027_market_eligible(auction.player_id)
        OR EXISTS (
          SELECT 1
          FROM public.user_rosters roster
          WHERE roster.league_id = p_league_id
            AND roster.player_id = auction.player_id
            AND roster.is_active = true
        )
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_removed FROM removed;

  SELECT count(*)
  INTO v_current_count
  FROM public.market_auctions auction
  WHERE auction.cycle_id = v_cycle_id
    AND auction.status = 'open';

  v_missing := GREATEST(p_players_target - v_current_count, 0);

  IF v_missing > 0 THEN
    INSERT INTO public.market_auctions (
      cycle_id,
      league_id,
      player_id,
      market_value_snapshot,
      starts_at,
      ends_at,
      status
    )
    SELECT
      v_cycle_id,
      p_league_id,
      player.id,
      COALESCE(player.market_value, 10000000)::bigint,
      v_now,
      v_ends_at,
      'open'
    FROM public.pro_players player
    JOIN public.vct_season_players season_player
      ON season_player.player_id = player.id
     AND season_player.season_year = 2027
    JOIN public.vct_season_teams season_team
      ON season_team.season_year = season_player.season_year
     AND season_team.team_id = season_player.team_id
    WHERE season_player.market_eligible = true
      AND season_player.roster_status IN ('active', 'substitute', 'benched')
      AND season_team.confirmation_status = 'confirmed'
      AND season_team.fantasy_eligible = true
      AND player.team_id = season_player.team_id
      AND COALESCE(player.is_legend, false) = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_rosters roster
        WHERE roster.league_id = p_league_id
          AND roster.player_id = player.id
          AND roster.is_active = true
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.market_auctions existing
        WHERE existing.cycle_id = v_cycle_id
          AND existing.player_id = player.id
      )
    ORDER BY random()
    LIMIT v_missing;
  END IF;

  SELECT count(*)
  INTO v_current_count
  FROM public.market_auctions auction
  WHERE auction.cycle_id = v_cycle_id
    AND auction.status = 'open';

  RETURN jsonb_build_object(
    'created', true,
    'cycle_id', v_cycle_id,
    'players', v_current_count,
    'removed_ineligible', v_removed,
    'ends_at', v_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_vct_2027_market_eligible(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_vct_2027_market_bid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_vct_2027_market(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Repair every currently open cycle immediately. This is idempotent and does
-- not alter rosters, budgets, points, claimed rewards or existing bids.
DO $$
DECLARE
  v_league record;
BEGIN
  FOR v_league IN
    SELECT DISTINCT cycle.league_id
    FROM public.market_cycles cycle
    WHERE cycle.status = 'open'
      AND cycle.ends_at > clock_timestamp()
  LOOP
    PERFORM public.ensure_vct_2027_market(v_league.league_id, 10);
  END LOOP;
END;
$$;

SELECT
  auction.league_id,
  count(*) FILTER (WHERE auction.status = 'open')::integer AS open_auctions,
  count(*) FILTER (
    WHERE auction.status = 'open'
      AND public.is_vct_2027_market_eligible(auction.player_id)
  )::integer AS eligible_open_auctions
FROM public.market_auctions auction
JOIN public.market_cycles cycle ON cycle.id = auction.cycle_id
WHERE cycle.status = 'open'
GROUP BY auction.league_id
ORDER BY auction.league_id;
