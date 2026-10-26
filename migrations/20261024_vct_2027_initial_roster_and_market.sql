-- VCT Fantasy 2027: altas de liga coherentes con la temporada activa.
--
-- 1. Conserva las funciones históricas para no perder su lógica de creación/unión.
-- 2. Repara el quinteto inicial para que sólo use jugadores elegibles de VCT 2027.
-- 3. Abre inmediatamente un mercado de 10 jugadores elegibles.
-- 4. Mantiene intactos presupuesto, puntos, bonus y pujas existentes.

CREATE OR REPLACE FUNCTION public.repair_vct_2027_initial_roster(
  p_league_id uuid,
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player_value bigint;
  v_roster_count integer;
  v_removed integer := 0;
  v_added integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.league_participants lp
    WHERE lp.league_id = p_league_id
      AND lp.profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'League participant not found';
  END IF;

  -- Quitar del reparto inicial cualquier jugador que no pertenezca al pool 2027.
  WITH removed AS (
    DELETE FROM public.user_rosters ur
    WHERE ur.league_id = p_league_id
      AND ur.profile_id = p_profile_id
      AND ur.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.vct_season_players vsp
        WHERE vsp.season_year = 2027
          AND vsp.player_id = ur.player_id
          AND vsp.market_eligible = true
      )
    RETURNING ur.id
  )
  SELECT count(*) INTO v_removed FROM removed;

  -- El mercado admite como máximo dos jugadores del mismo rol (Flex es libre).
  WITH ranked AS (
    SELECT
      ur.id,
      pp.role,
      row_number() OVER (
        PARTITION BY pp.role
        ORDER BY ur.created_at, ur.id
      ) AS role_position
    FROM public.user_rosters ur
    JOIN public.pro_players pp ON pp.id = ur.player_id
    WHERE ur.league_id = p_league_id
      AND ur.profile_id = p_profile_id
      AND ur.is_active = true
  ), removed AS (
    DELETE FROM public.user_rosters ur
    USING ranked r
    WHERE ur.id = r.id
      AND r.role <> 'Flex'
      AND r.role_position > 2
    RETURNING ur.id
  )
  SELECT v_removed + count(*) INTO v_removed FROM removed;

  SELECT count(*)
  INTO v_roster_count
  FROM public.user_rosters ur
  WHERE ur.league_id = p_league_id
    AND ur.profile_id = p_profile_id
    AND ur.is_active = true;

  WHILE v_roster_count < 5 LOOP
    SELECT pp.id, COALESCE(pp.market_value, 10000000)::bigint
    INTO v_player_id, v_player_value
    FROM public.pro_players pp
    JOIN public.vct_season_players vsp
      ON vsp.player_id = pp.id
     AND vsp.season_year = 2027
     AND vsp.market_eligible = true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_rosters owned
      WHERE owned.league_id = p_league_id
        AND owned.player_id = pp.id
        AND owned.is_active = true
    )
      AND (
        pp.role = 'Flex'
        OR (
          SELECT count(*)
          FROM public.user_rosters own_role
          JOIN public.pro_players own_player ON own_player.id = own_role.player_id
          WHERE own_role.league_id = p_league_id
            AND own_role.profile_id = p_profile_id
            AND own_role.is_active = true
            AND own_player.role = pp.role
        ) < 2
      )
    ORDER BY
      (
        SELECT count(*)
        FROM public.user_rosters own_role
        JOIN public.pro_players own_player ON own_player.id = own_role.player_id
        WHERE own_role.league_id = p_league_id
          AND own_role.profile_id = p_profile_id
          AND own_role.is_active = true
          AND own_player.role = pp.role
      ),
      random()
    LIMIT 1;

    IF v_player_id IS NULL THEN
      RAISE EXCEPTION 'Not enough eligible VCT 2027 players';
    END IF;

    INSERT INTO public.user_rosters (
      league_id,
      profile_id,
      player_id,
      acquisition_price,
      release_clause,
      is_active,
      is_starter,
      slot_type,
      acquired_at,
      clause_protected_until
    )
    VALUES (
      p_league_id,
      p_profile_id,
      v_player_id,
      0,
      v_player_value,
      true,
      true,
      'starter',
      now(),
      now() + interval '48 hours'
    );

    v_added := v_added + 1;
    v_roster_count := v_roster_count + 1;
    v_player_id := NULL;
  END LOOP;

  RETURN jsonb_build_object(
    'removed', v_removed,
    'added', v_added,
    'active_players', v_roster_count
  );
END;
$$;

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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = p_league_id) THEN
    RAISE EXCEPTION 'League not found';
  END IF;

  SELECT mc.id, mc.ends_at
  INTO v_cycle_id, v_ends_at
  FROM public.market_cycles mc
  WHERE mc.league_id = p_league_id
    AND mc.status = 'open'
    AND mc.ends_at > v_now
  ORDER BY mc.created_at DESC
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
      SELECT mc.id, mc.ends_at
      INTO v_cycle_id, v_ends_at
      FROM public.market_cycles mc
      WHERE mc.league_id = p_league_id
        AND mc.market_date = v_market_date
        AND mc.status = 'open'
        AND mc.ends_at > v_now
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

  -- No se eliminan subastas que ya tengan pujas. Las antiguas terminan con normalidad.
  DELETE FROM public.market_auctions ma
  WHERE ma.cycle_id = v_cycle_id
    AND ma.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_bids ub WHERE ub.auction_id = ma.id
    )
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.vct_season_players vsp
        WHERE vsp.season_year = 2027
          AND vsp.player_id = ma.player_id
          AND vsp.market_eligible = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_rosters ur
        WHERE ur.league_id = p_league_id
          AND ur.player_id = ma.player_id
          AND ur.is_active = true
      )
    );

  SELECT count(*)
  INTO v_current_count
  FROM public.market_auctions ma
  WHERE ma.cycle_id = v_cycle_id
    AND ma.status = 'open';

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
      pp.id,
      COALESCE(pp.market_value, 10000000)::bigint,
      v_now,
      v_ends_at,
      'open'
    FROM public.pro_players pp
    JOIN public.vct_season_players vsp
      ON vsp.player_id = pp.id
     AND vsp.season_year = 2027
     AND vsp.market_eligible = true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_rosters ur
      WHERE ur.league_id = p_league_id
        AND ur.player_id = pp.id
        AND ur.is_active = true
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.market_auctions existing
        WHERE existing.cycle_id = v_cycle_id
          AND existing.player_id = pp.id
      )
    ORDER BY random()
    LIMIT v_missing;
  END IF;

  SELECT count(*)
  INTO v_current_count
  FROM public.market_auctions ma
  WHERE ma.cycle_id = v_cycle_id
    AND ma.status = 'open';

  RETURN jsonb_build_object(
    'created', true,
    'cycle_id', v_cycle_id,
    'players', v_current_count,
    'ends_at', v_ends_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vct_2027_fantasy_league(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_league_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_result := to_jsonb(public.create_fantasy_league(p_name));
  v_league_id := NULLIF(v_result ->> 'league_id', '')::uuid;

  IF v_league_id IS NULL THEN
    SELECT l.id
    INTO v_league_id
    FROM public.leagues l
    WHERE l.creator_id = auth.uid()
      AND l.name = trim(p_name)
    ORDER BY l.created_at DESC
    LIMIT 1;
  END IF;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Created league could not be identified';
  END IF;

  PERFORM public.repair_vct_2027_initial_roster(v_league_id, auth.uid());
  PERFORM public.ensure_vct_2027_market(v_league_id, 10);

  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('league_id', v_league_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_vct_2027_fantasy_league(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_league_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_result := to_jsonb(public.join_fantasy_league(p_invite_code));

  SELECT l.id
  INTO v_league_id
  FROM public.leagues l
  JOIN public.league_participants lp ON lp.league_id = l.id
  WHERE lp.profile_id = auth.uid()
    AND upper(l.invite_code) = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Joined league could not be identified';
  END IF;

  PERFORM public.repair_vct_2027_initial_roster(v_league_id, auth.uid());
  PERFORM public.ensure_vct_2027_market(v_league_id, 10);

  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('league_id', v_league_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_vct_2027_daily_market_engine()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league record;
  v_processed integer := 0;
BEGIN
  -- Resolver resultados conserva toda la lógica económica histórica.
  PERFORM public.resolve_expired_market_auctions();
  PERFORM public.open_scheduled_markets();

  FOR v_league IN SELECT l.id FROM public.leagues l LOOP
    PERFORM public.ensure_vct_2027_market(v_league.id, 10);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'leagues_processed', v_processed);
END;
$$;

REVOKE ALL ON FUNCTION public.repair_vct_2027_initial_roster(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_vct_2027_market(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_vct_2027_daily_market_engine() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_vct_2027_fantasy_league(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_vct_2027_fantasy_league(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_vct_2027_fantasy_league(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_vct_2027_fantasy_league(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_vct_2027_daily_market_engine() TO service_role;

-- Reparación puntual e idempotente de la liga usada en la prueba E2E.
DO $$
DECLARE
  v_league_id uuid;
  v_profile_id uuid;
BEGIN
  SELECT l.id, p.id
  INTO v_league_id, v_profile_id
  FROM public.leagues l
  JOIN public.league_participants lp ON lp.league_id = l.id
  JOIN public.profiles p ON p.id = lp.profile_id
  WHERE lower(l.name) = lower('Luro3 Liga')
    AND lower(p.username) = lower('Luro3')
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF v_league_id IS NOT NULL THEN
    PERFORM public.repair_vct_2027_initial_roster(v_league_id, v_profile_id);
    PERFORM public.ensure_vct_2027_market(v_league_id, 10);
  END IF;
END;
$$;
