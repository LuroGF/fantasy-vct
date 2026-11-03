-- Transactional integration test for league leadership and moderation RPCs.
-- It uses three existing controlled profiles, creates one isolated league and
-- always rolls back. No league, report, notification or gameweek change is
-- persisted when the script finishes successfully.

BEGIN;

-- The membership RPCs intentionally block during a live gameweek. Disable any
-- active flag only inside this transaction so the functional test can run.
UPDATE public.gameweeks
SET is_active = false
WHERE is_active = true;

INSERT INTO public.leagues (
  id,
  name,
  creator_id,
  is_public,
  max_participants,
  budget_limit
)
VALUES (
  '00000000-0000-4000-8000-000000000271',
  '__transactional_league_management_test__',
  'd1618f44-560f-4df0-986d-f81bf7d8349c', -- LuroGF
  false,
  3,
  100000000
);

INSERT INTO public.league_participants (
  league_id,
  profile_id,
  current_budget,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000271',
    'd1618f44-560f-4df0-986d-f81bf7d8349c', -- LuroGF / leader
    50000000,
    '2026-11-02 10:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000271',
    '18e92f19-37de-4c39-a3a1-a08f1a8f5b8a', -- Luro2 / next leader
    50000000,
    '2026-11-02 10:01:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000271',
    '0521c3d1-b64a-4990-b0a6-222814fb8dac', -- Luro3
    50000000,
    '2026-11-02 10:02:00+00'
  );

-- A normal member must not be able to kick another member.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"18e92f19-37de-4c39-a3a1-a08f1a8f5b8a","role":"authenticated"}',
  true
);

DO $expect_non_leader_kick_denial$
BEGIN
  BEGIN
    PERFORM public.kick_fantasy_league_member(
      '00000000-0000-4000-8000-000000000271',
      '0521c3d1-b64a-4990-b0a6-222814fb8dac'
    );
    RAISE EXCEPTION 'Expected the non-leader kick attempt to fail';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Only the league leader can remove participants%' THEN
        RAISE;
      END IF;
  END;
END;
$expect_non_leader_kick_denial$;

-- Luro2 reports Luro3.
SET LOCAL ROLE authenticated;
SELECT public.report_fantasy_league_member(
  '00000000-0000-4000-8000-000000000271',
  '0521c3d1-b64a-4990-b0a6-222814fb8dac',
  'inactivity',
  'Transactional test report; this row is rolled back.'
);
RESET ROLE;

DO $verify_report_created$
BEGIN
  IF (
    SELECT count(*)
    FROM public.league_reports
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND reporter_id = '18e92f19-37de-4c39-a3a1-a08f1a8f5b8a'
      AND target_profile_id = '0521c3d1-b64a-4990-b0a6-222814fb8dac'
      AND reason = 'inactivity'
      AND status = 'pending'
  ) <> 1 THEN
    RAISE EXCEPTION 'Pending report was not created exactly once';
  END IF;

  IF (
    SELECT count(*)
    FROM public.notifications
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND profile_id = 'd1618f44-560f-4df0-986d-f81bf7d8349c'
      AND type = 'league_member_reported'
  ) <> 1 THEN
    RAISE EXCEPTION 'Leader report notification was not created exactly once';
  END IF;
END;
$verify_report_created$;

-- The current leader dismisses the report.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"d1618f44-560f-4df0-986d-f81bf7d8349c","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT public.dismiss_fantasy_league_report(
  (
    SELECT id
    FROM public.league_reports
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND status = 'pending'
    LIMIT 1
  )
);
RESET ROLE;

DO $verify_report_dismissed$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.league_reports
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND status = 'dismissed'
      AND resolved_by = 'd1618f44-560f-4df0-986d-f81bf7d8349c'
      AND resolved_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Leader did not dismiss the report correctly';
  END IF;
END;
$verify_report_dismissed$;

-- The leader kicks Luro3.
SET LOCAL ROLE authenticated;
SELECT public.kick_fantasy_league_member(
  '00000000-0000-4000-8000-000000000271',
  '0521c3d1-b64a-4990-b0a6-222814fb8dac'
);
RESET ROLE;

DO $verify_member_kicked$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.league_participants
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND profile_id = '0521c3d1-b64a-4990-b0a6-222814fb8dac'
  ) THEN
    RAISE EXCEPTION 'Kicked member still belongs to the league';
  END IF;

  IF (
    SELECT count(*)
    FROM public.notifications
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND profile_id = '0521c3d1-b64a-4990-b0a6-222814fb8dac'
      AND type = 'league_member_removed'
  ) <> 1 THEN
    RAISE EXCEPTION 'Kick notification was not created exactly once';
  END IF;
END;
$verify_member_kicked$;

-- The leader leaves; leadership must transfer to the oldest remaining member.
SELECT public.leave_fantasy_league(
  '00000000-0000-4000-8000-000000000271'
);

DO $verify_leadership_transfer$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = '00000000-0000-4000-8000-000000000271'
      AND creator_id = '18e92f19-37de-4c39-a3a1-a08f1a8f5b8a'
  ) THEN
    RAISE EXCEPTION 'Leadership was not transferred to Luro2';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_participants
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND profile_id = 'd1618f44-560f-4df0-986d-f81bf7d8349c'
  ) THEN
    RAISE EXCEPTION 'Departing leader still belongs to the league';
  END IF;

  IF (
    SELECT count(*)
    FROM public.notifications
    WHERE league_id = '00000000-0000-4000-8000-000000000271'
      AND profile_id = '18e92f19-37de-4c39-a3a1-a08f1a8f5b8a'
      AND type = 'league_leadership_transferred'
  ) <> 1 THEN
    RAISE EXCEPTION 'Leadership transfer notification was not created exactly once';
  END IF;
END;
$verify_leadership_transfer$;

-- The new leader is now the only member; leaving must delete the test league.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"18e92f19-37de-4c39-a3a1-a08f1a8f5b8a","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT public.leave_fantasy_league(
  '00000000-0000-4000-8000-000000000271'
);
RESET ROLE;

DO $verify_last_member_deleted_league$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = '00000000-0000-4000-8000-000000000271'
  ) THEN
    RAISE EXCEPTION 'Last member leaving did not delete the test league';
  END IF;
END;
$verify_last_member_deleted_league$;

ROLLBACK;

SELECT jsonb_build_object(
  'status', 'passed',
  'non_leader_kick_denied', true,
  'report_created_and_notified', true,
  'report_dismissed', true,
  'member_kicked_and_notified', true,
  'leadership_transferred_and_notified', true,
  'last_member_deleted_league', true,
  'persistence', 'none: transaction rolled back'
) AS test_result;
