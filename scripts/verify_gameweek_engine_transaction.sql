-- End-to-end test for the versioned gameweek engine.
-- Every write is enclosed in one transaction and ALWAYS rolled back.

BEGIN;

CREATE TEMP TABLE _gw_test_profiles ON COMMIT DROP AS
SELECT
  profile.id AS profile_id,
  row_number() OVER (ORDER BY profile.created_at, profile.id)::integer AS position
FROM public.profiles profile
ORDER BY profile.created_at, profile.id
LIMIT 3;

CREATE TEMP TABLE _gw_test_players ON COMMIT DROP AS
SELECT
  player.id AS player_id,
  row_number() OVER (ORDER BY player.id)::integer AS position
FROM public.pro_players player
WHERE player.team_id IS NOT NULL
ORDER BY player.id
LIMIT 15;

DO $$
BEGIN
  IF (SELECT count(*) FROM _gw_test_profiles) <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: three profiles are required';
  END IF;

  IF (SELECT count(*) FROM _gw_test_players) <> 15 THEN
    RAISE EXCEPTION 'TEST FAILED: fifteen players are required';
  END IF;
END;
$$;

CREATE TEMP TABLE _gw_test_context (
  league_id uuid NOT NULL,
  gameweek_id integer,
  match_id uuid
) ON COMMIT DROP;

INSERT INTO _gw_test_context (league_id)
VALUES (gen_random_uuid());

INSERT INTO public.leagues (
  id,
  name,
  invite_code,
  creator_id,
  is_public,
  max_participants,
  budget_limit
)
SELECT
  context.league_id,
  '__GAMEWEEK_ENGINE_ROLLBACK_TEST__',
  'GW' || upper(substr(replace(context.league_id::text, '-', ''), 1, 6)),
  profile.profile_id,
  false,
  3,
  50000000
FROM _gw_test_context context
CROSS JOIN LATERAL (
  SELECT profile_id
  FROM _gw_test_profiles
  WHERE position = 1
) profile;

INSERT INTO public.league_participants (
  league_id,
  profile_id,
  current_budget,
  total_points
)
SELECT
  context.league_id,
  profile.profile_id,
  50000000,
  0
FROM _gw_test_context context
CROSS JOIN _gw_test_profiles profile;

CREATE TEMP TABLE _gw_test_assignments ON COMMIT DROP AS
SELECT
  context.league_id,
  profile.profile_id,
  profile.position AS manager_position,
  player.player_id
FROM _gw_test_context context
CROSS JOIN _gw_test_profiles profile
JOIN _gw_test_players player
  ON player.position BETWEEN ((profile.position - 1) * 5) + 1
                         AND profile.position * 5;

INSERT INTO public.user_rosters (
  league_id,
  profile_id,
  player_id,
  acquisition_price,
  is_active,
  is_starter,
  slot_type,
  release_clause
)
SELECT
  assignment.league_id,
  assignment.profile_id,
  assignment.player_id,
  0,
  true,
  true,
  'starter',
  10000000
FROM _gw_test_assignments assignment;

WITH inserted AS (
  INSERT INTO public.gameweeks (
    name,
    start_date,
    end_date,
    is_active,
    is_locked,
    is_final
  ) VALUES (
    '__JORNADA_ROLLBACK_TEST__',
    now() - interval '2 hours',
    now() + interval '2 hours',
    false,
    false,
    false
  )
  RETURNING id
)
UPDATE _gw_test_context context
SET gameweek_id = inserted.id
FROM inserted;

WITH selected_teams AS (
  SELECT
    team.id,
    row_number() OVER (ORDER BY team.id)::integer AS position
  FROM public.pro_teams team
  ORDER BY team.id
  LIMIT 2
),
inserted AS (
  INSERT INTO public.matches (
    id,
    vlr_id,
    team_a,
    team_b,
    match_date,
    status,
    gameweek_id
  )
  SELECT
    gen_random_uuid(),
    '__gw_rollback_test_' || replace(context.league_id::text, '-', ''),
    (SELECT id FROM selected_teams WHERE position = 1),
    (SELECT id FROM selected_teams WHERE position = 2),
    now(),
    'upcoming',
    context.gameweek_id
  FROM _gw_test_context context
  RETURNING id
)
UPDATE _gw_test_context context
SET match_id = inserted.id
FROM inserted;

-- Phase 1: activation + lock + immutable lineup capture.
SELECT public.run_gameweek_engine() AS activation_result;

DO $$
DECLARE
  v_context _gw_test_context%ROWTYPE;
BEGIN
  SELECT * INTO v_context FROM _gw_test_context;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gameweeks
    WHERE id = v_context.gameweek_id
      AND is_active = true
      AND is_locked = true
      AND is_final = false
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: the current gameweek was not activated and locked';
  END IF;

  IF (
    SELECT count(*)
    FROM public.gameweek_lineups
    WHERE gameweek_id = v_context.gameweek_id
      AND league_id = v_context.league_id
  ) <> 15 THEN
    RAISE EXCEPTION 'TEST FAILED: expected fifteen frozen starters';
  END IF;
END;
$$;

-- Managers receive deliberately different performances. The scoring trigger
-- calculates fantasy_points using the installed V1 formula.
INSERT INTO public.player_performances (
  match_id,
  player_id,
  kills,
  deaths,
  assists,
  clutches,
  fb,
  fd,
  acs,
  map_name,
  mvp
)
SELECT
  context.match_id,
  assignment.player_id,
  CASE assignment.manager_position
    WHEN 1 THEN 15
    WHEN 2 THEN 10
    ELSE 5
  END,
  0,
  0,
  0,
  0,
  0,
  200,
  'Rollback Test Map',
  false
FROM _gw_test_context context
JOIN _gw_test_assignments assignment ON true;

SELECT public.recalculate_gameweek_fantasy_points(
  (SELECT gameweek_id FROM _gw_test_context)
) AS scoring_result;

DO $$
DECLARE
  v_league_id uuid := (SELECT league_id FROM _gw_test_context);
  v_gameweek_id integer := (SELECT gameweek_id FROM _gw_test_context);
BEGIN
  IF (
    SELECT count(*)
    FROM public.participant_scores_history
    WHERE league_id = v_league_id
      AND gameweek_id = v_gameweek_id
  ) <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: expected three participant scores';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        profile.position,
        score.rank_in_league
      FROM public.participant_scores_history score
      JOIN _gw_test_profiles profile ON profile.profile_id = score.profile_id
      WHERE score.league_id = v_league_id
        AND score.gameweek_id = v_gameweek_id
    ) ranked
    WHERE ranked.position <> ranked.rank_in_league
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: ranks are not 1, 2 and 3 as expected';
  END IF;
END;
$$;

-- Phase 2: completed match + elapsed interval => finalization.
UPDATE public.matches
SET status = 'completed'
WHERE id = (SELECT match_id FROM _gw_test_context);

UPDATE public.gameweeks
SET end_date = now() - interval '1 second'
WHERE id = (SELECT gameweek_id FROM _gw_test_context);

SELECT public.run_gameweek_engine() AS finalization_result;
SELECT public.settle_gameweek_rewards(
  (SELECT gameweek_id FROM _gw_test_context)
) AS reward_result;

DO $$
DECLARE
  v_league_id uuid := (SELECT league_id FROM _gw_test_context);
  v_gameweek_id integer := (SELECT gameweek_id FROM _gw_test_context);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.gameweeks
    WHERE id = v_gameweek_id
      AND is_active = false
      AND is_locked = true
      AND is_final = true
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: the completed gameweek was not finalized';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.gameweek_rewards reward
    JOIN _gw_test_profiles profile ON profile.profile_id = reward.profile_id
    WHERE reward.league_id = v_league_id
      AND reward.gameweek_id = v_gameweek_id
      AND reward.amount <> CASE profile.position
        WHEN 1 THEN 2000000
        WHEN 2 THEN 1250000
        ELSE 750000
      END
  ) OR (
    SELECT count(*)
    FROM public.gameweek_rewards
    WHERE league_id = v_league_id
      AND gameweek_id = v_gameweek_id
  ) <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: reward amounts are incorrect';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_participants participant
    JOIN _gw_test_profiles profile ON profile.profile_id = participant.profile_id
    WHERE participant.league_id = v_league_id
      AND participant.current_budget <> 50000000 + CASE profile.position
        WHEN 1 THEN 2000000
        WHEN 2 THEN 1250000
        ELSE 750000
      END
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: participant budgets were not credited correctly';
  END IF;

  IF (
    SELECT count(*)
    FROM public.notifications
    WHERE league_id = v_league_id
      AND type = 'gameweek_reward'
  ) <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: expected three reward notifications';
  END IF;

  RAISE NOTICE 'TEST PASSED: snapshot, scoring, ranks, finalization, rewards and notifications are correct. All changes will now be rolled back.';
END;
$$;

SELECT jsonb_build_object(
  'status', 'passed',
  'lineups', (
    SELECT count(*)
    FROM public.gameweek_lineups
    WHERE league_id = (SELECT league_id FROM _gw_test_context)
      AND gameweek_id = (SELECT gameweek_id FROM _gw_test_context)
  ),
  'scores', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', score.rank_in_league,
        'points', score.points_earned,
        'reward', reward.amount
      )
      ORDER BY score.rank_in_league
    )
    FROM public.participant_scores_history score
    JOIN public.gameweek_rewards reward
      ON reward.league_id = score.league_id
     AND reward.profile_id = score.profile_id
     AND reward.gameweek_id = score.gameweek_id
    WHERE score.league_id = (SELECT league_id FROM _gw_test_context)
      AND score.gameweek_id = (SELECT gameweek_id FROM _gw_test_context)
  ),
  'persistence', 'none: transaction rolls back below'
) AS test_result;

ROLLBACK;
