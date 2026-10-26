-- VCT Fantasy 2027: secure lineup changes and freeze starters at gameweek lock.
-- Safe to run before the season: it does not activate or modify any gameweek.

CREATE OR REPLACE FUNCTION public.capture_gameweek_lineups(
  p_gameweek_id integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_locked boolean;
  v_inserted integer := 0;
BEGIN
  SELECT COALESCE(is_locked, false)
    INTO v_locked
    FROM public.gameweeks
   WHERE id = p_gameweek_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gameweek % does not exist', p_gameweek_id;
  END IF;

  IF NOT v_locked THEN
    RAISE EXCEPTION 'Gameweek % is not locked', p_gameweek_id;
  END IF;

  -- A participant is captured only once. An incomplete lineup remains incomplete,
  -- which prevents a late fifth player from entering after the deadline.
  INSERT INTO public.gameweek_lineups (
    gameweek_id,
    league_id,
    profile_id,
    roster_id,
    player_id,
    captured_at
  )
  SELECT
    p_gameweek_id,
    roster.league_id,
    roster.profile_id,
    roster.id,
    roster.player_id,
    now()
  FROM public.user_rosters roster
  WHERE roster.is_active = true
    AND (
      roster.is_starter = true
      OR roster.slot_type = 'starter'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.gameweek_lineups existing
      WHERE existing.gameweek_id = p_gameweek_id
        AND existing.league_id = roster.league_id
        AND existing.profile_id = roster.profile_id
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_lineups_when_gameweek_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_locked = true AND OLD.is_locked IS DISTINCT FROM true THEN
    PERFORM public.capture_gameweek_lineups(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_lineups_when_gameweek_locks
  ON public.gameweeks;
CREATE TRIGGER trg_capture_lineups_when_gameweek_locks
AFTER UPDATE OF is_locked ON public.gameweeks
FOR EACH ROW
EXECUTE FUNCTION public.capture_lineups_when_gameweek_locks();

CREATE OR REPLACE FUNCTION public.capture_lineups_for_locked_gameweek_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_locked = true THEN
    PERFORM public.capture_gameweek_lineups(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_lineups_for_locked_gameweek_insert
  ON public.gameweeks;
CREATE TRIGGER trg_capture_lineups_for_locked_gameweek_insert
AFTER INSERT ON public.gameweeks
FOR EACH ROW
EXECUTE FUNCTION public.capture_lineups_for_locked_gameweek_insert();

-- The historical project has used both json and jsonb as the return type.
-- PostgreSQL cannot change a function return type with CREATE OR REPLACE,
-- so remove only this RPC signature before recreating it below.
DROP FUNCTION IF EXISTS public.handle_set_starter_status(
  uuid,
  uuid,
  uuid,
  text
);

CREATE OR REPLACE FUNCTION public.handle_set_starter_status(
  p_league_id uuid,
  p_profile_id uuid,
  p_player_id uuid,
  p_new_slot text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_role text;
  v_current_slot text;
  v_is_starter boolean;
  v_target_slot text;
  v_starter_count integer;
  v_lineup_locked boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_profile_id THEN
    RETURN json_build_object('success', false, 'message', 'Acceso no autorizado.');
  END IF;

  IF p_new_slot NOT IN ('starter', 'bench', 'substitute') THEN
    RETURN json_build_object('success', false, 'message', 'Posición no válida.');
  END IF;

  v_target_slot := CASE
    WHEN p_new_slot = 'starter' THEN 'starter'
    ELSE 'bench'
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM public.league_participants participant
    WHERE participant.league_id = p_league_id
      AND participant.profile_id = p_profile_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'No perteneces a esta liga.');
  END IF;

  SELECT
    player.role,
    roster.slot_type,
    COALESCE(roster.is_starter, false)
    INTO v_player_role, v_current_slot, v_is_starter
  FROM public.user_rosters roster
  JOIN public.pro_players player ON player.id = roster.player_id
  WHERE roster.league_id = p_league_id
    AND roster.profile_id = p_profile_id
    AND roster.player_id = p_player_id
    AND roster.is_active = true
  FOR UPDATE OF roster;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'El jugador no pertenece a tu plantilla activa.');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.gameweeks gameweek
    WHERE (
      gameweek.is_active = true
      OR now() BETWEEN gameweek.start_date AND gameweek.end_date
    )
      AND (
        COALESCE(gameweek.is_locked, false) = true
        OR now() >= gameweek.start_date
      )
  ) INTO v_lineup_locked;

  IF v_lineup_locked THEN
    RETURN json_build_object(
      'success', false,
      'message', 'La jornada ya ha comenzado y el quinteto está bloqueado.'
    );
  END IF;

  IF (v_target_slot = 'starter' AND v_is_starter)
     OR (v_target_slot = 'bench' AND NOT v_is_starter) THEN
    RETURN json_build_object('success', true, 'message', 'El jugador ya está en esa posición.');
  END IF;

  IF v_target_slot = 'starter' THEN
    -- One starter per declared role. Promoting a player swaps out any starter
    -- with the same role before checking the five-player limit.
    UPDATE public.user_rosters roster
       SET slot_type = 'bench',
           is_starter = false
      FROM public.pro_players player
     WHERE roster.player_id = player.id
       AND roster.league_id = p_league_id
       AND roster.profile_id = p_profile_id
       AND roster.is_active = true
       AND roster.player_id <> p_player_id
       AND (roster.is_starter = true OR roster.slot_type = 'starter')
       AND player.role IS NOT DISTINCT FROM v_player_role;

    SELECT count(*)
      INTO v_starter_count
      FROM public.user_rosters roster
     WHERE roster.league_id = p_league_id
       AND roster.profile_id = p_profile_id
       AND roster.is_active = true
       AND (roster.is_starter = true OR roster.slot_type = 'starter');

    IF v_starter_count >= 5 THEN
      RETURN json_build_object('success', false, 'message', 'Ya tienes cinco titulares.');
    END IF;
  END IF;

  UPDATE public.user_rosters
     SET slot_type = v_target_slot,
         is_starter = (v_target_slot = 'starter')
   WHERE league_id = p_league_id
     AND profile_id = p_profile_id
     AND player_id = p_player_id
     AND is_active = true;

  RETURN json_build_object(
    'success', true,
    'role', v_player_role,
    'slot', v_target_slot
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_gameweek_lineups(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_lineups_when_gameweek_locks() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_lineups_for_locked_gameweek_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_set_starter_status(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_gameweek_lineups(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_set_starter_status(uuid, uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.capture_gameweek_lineups(integer) IS
  'Freezes each participant starter lineup exactly once when a gameweek becomes locked.';
