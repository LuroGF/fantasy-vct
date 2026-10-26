-- VCT Fantasy 2027: versioned, snapshot-based gameweek scoring engine.
-- Requires 20261026_gameweek_lineup_lock_hardening.sql.

-- Historical environments used different return types. Drop only these RPC
-- signatures before recreating their canonical implementations.
DROP FUNCTION IF EXISTS public.run_gameweek_engine();
DROP FUNCTION IF EXISTS public.recalculate_gameweek_fantasy_points(integer);

CREATE FUNCTION public.recalculate_gameweek_fantasy_points(
  p_gameweek_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gameweek_exists boolean;
  v_score_rows integer := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.gameweeks
    WHERE id = p_gameweek_id
  ) INTO v_gameweek_exists;

  IF NOT v_gameweek_exists THEN
    RAISE EXCEPTION 'Gameweek % does not exist', p_gameweek_id;
  END IF;

  -- Every captured participant receives a row, even when the total is zero.
  -- Only frozen starters can contribute points.
  INSERT INTO public.participant_scores_history (
    league_id,
    profile_id,
    gameweek_id,
    points_earned,
    rank_in_league
  )
  WITH captured_participants AS (
    SELECT DISTINCT
      lineup.league_id,
      lineup.profile_id
    FROM public.gameweek_lineups lineup
    WHERE lineup.gameweek_id = p_gameweek_id
  ),
  totals AS (
    SELECT
      lineup.league_id,
      lineup.profile_id,
      COALESCE(sum(performance.fantasy_points), 0)::integer AS points_earned
    FROM public.gameweek_lineups lineup
    LEFT JOIN public.matches match
      ON match.gameweek_id = lineup.gameweek_id
    LEFT JOIN public.player_performances performance
      ON performance.match_id = match.id
     AND performance.player_id = lineup.player_id
    WHERE lineup.gameweek_id = p_gameweek_id
    GROUP BY lineup.league_id, lineup.profile_id
  )
  SELECT
    participant.league_id,
    participant.profile_id,
    p_gameweek_id,
    COALESCE(totals.points_earned, 0),
    NULL
  FROM captured_participants participant
  LEFT JOIN totals
    ON totals.league_id = participant.league_id
   AND totals.profile_id = participant.profile_id
  ON CONFLICT (league_id, profile_id, gameweek_id)
  DO UPDATE SET
    points_earned = EXCLUDED.points_earned;

  GET DIAGNOSTICS v_score_rows = ROW_COUNT;

  WITH ranked AS (
    SELECT
      score.league_id,
      score.profile_id,
      rank() OVER (
        PARTITION BY score.league_id
        ORDER BY score.points_earned DESC
      )::integer AS rank_position
    FROM public.participant_scores_history score
    WHERE score.gameweek_id = p_gameweek_id
  )
  UPDATE public.participant_scores_history score
     SET rank_in_league = ranked.rank_position
    FROM ranked
   WHERE score.gameweek_id = p_gameweek_id
     AND score.league_id = ranked.league_id
     AND score.profile_id = ranked.profile_id;

  -- League totals are derived from the immutable gameweek ledger, never by
  -- incrementing the previous value. Re-running the engine is idempotent.
  UPDATE public.league_participants participant
     SET total_points = COALESCE((
       SELECT sum(history.points_earned)::integer
       FROM public.participant_scores_history history
       WHERE history.league_id = participant.league_id
         AND history.profile_id = participant.profile_id
     ), 0)
   WHERE EXISTS (
     SELECT 1
     FROM public.participant_scores_history history
     WHERE history.league_id = participant.league_id
       AND history.profile_id = participant.profile_id
   );

  UPDATE public.profiles profile
     SET global_points = COALESCE((
       SELECT sum(participant.total_points)::integer
       FROM public.league_participants participant
       WHERE participant.profile_id = profile.id
     ), 0)
   WHERE EXISTS (
     SELECT 1
     FROM public.league_participants participant
     WHERE participant.profile_id = profile.id
   );

  RETURN jsonb_build_object(
    'gameweek_id', p_gameweek_id,
    'scores', v_score_rows
  );
END;
$$;

CREATE FUNCTION public.run_gameweek_engine()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_current public.gameweeks%ROWTYPE;
  v_finished record;
  v_finalized integer := 0;
  v_recalculated integer := 0;
BEGIN
  -- A date interval is the source of truth. This also repairs a stale
  -- is_active flag if a scheduled invocation was missed.
  SELECT *
    INTO v_current
    FROM public.gameweeks
   WHERE start_date <= v_now
     AND end_date >= v_now
   ORDER BY start_date DESC
   LIMIT 1;

  IF FOUND THEN
    UPDATE public.gameweeks
       SET is_active = (id = v_current.id)
     WHERE is_active = true
        OR id = v_current.id;

    -- The lock transition fires the snapshot trigger installed by the
    -- hardening migration. Repeated calls do not replace a frozen lineup.
    UPDATE public.gameweeks
       SET is_locked = true
     WHERE id = v_current.id
       AND COALESCE(is_locked, false) = false;

    -- Handles a gameweek that was already locked before the trigger existed.
    PERFORM public.capture_gameweek_lineups(v_current.id);
    PERFORM public.recalculate_gameweek_fantasy_points(v_current.id);
    v_recalculated := v_recalculated + 1;
  ELSE
    UPDATE public.gameweeks
       SET is_active = false
     WHERE is_active = true
       AND NOT (start_date <= v_now AND end_date >= v_now);
  END IF;

  -- A gameweek becomes final only after its time window and every linked
  -- match have ended. Empty calendar weeks remain non-final and pay nothing.
  FOR v_finished IN
    SELECT gameweek.id
    FROM public.gameweeks gameweek
    WHERE gameweek.end_date < v_now
      AND COALESCE(gameweek.is_final, false) = false
      AND EXISTS (
        SELECT 1
        FROM public.matches match
        WHERE match.gameweek_id = gameweek.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.matches match
        WHERE match.gameweek_id = gameweek.id
          AND lower(COALESCE(match.status, '')) NOT IN ('finished', 'completed')
      )
    ORDER BY gameweek.id
    FOR UPDATE OF gameweek
  LOOP
    UPDATE public.gameweeks
       SET is_locked = true,
           is_active = false
     WHERE id = v_finished.id;

    PERFORM public.capture_gameweek_lineups(v_finished.id);
    PERFORM public.recalculate_gameweek_fantasy_points(v_finished.id);

    UPDATE public.gameweeks
       SET is_final = true
     WHERE id = v_finished.id;

    v_finalized := v_finalized + 1;
    v_recalculated := v_recalculated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', v_now,
    'active_gameweek_id', CASE WHEN v_current.id IS NULL THEN NULL ELSE v_current.id END,
    'recalculated', v_recalculated,
    'finalized', v_finalized
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_gameweek_fantasy_points(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_gameweek_engine() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_gameweek_fantasy_points(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_gameweek_engine() TO service_role;

COMMENT ON FUNCTION public.recalculate_gameweek_fantasy_points(integer) IS
  'Idempotently scores one gameweek using only its frozen starter lineups.';
COMMENT ON FUNCTION public.run_gameweek_engine() IS
  'Activates and locks the current dated gameweek, recalculates points, and finalizes completed gameweeks.';
