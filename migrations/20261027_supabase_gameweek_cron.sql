-- Keep the time-sensitive gameweek lock/snapshot independent from Vercel
-- Hobby's once-per-day cron limitation. The existing daily Vercel job remains
-- as a fallback and continues to run market/notification maintenance.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.run_gameweek_cron_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gameweek jsonb;
  v_rewards jsonb;
BEGIN
  -- Prevent overlapping executions if one tick happens to run for longer than
  -- the five-minute interval. The lock is released with the transaction.
  IF NOT pg_try_advisory_xact_lock(2027102701) THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'already_running',
      'ran_at', now()
    );
  END IF;

  v_gameweek := public.run_gameweek_engine();
  v_rewards := public.settle_finished_gameweek_rewards();

  RETURN jsonb_build_object(
    'status', 'completed',
    'ran_at', now(),
    'gameweek', v_gameweek,
    'rewards', v_rewards
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_gameweek_cron_tick() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_gameweek_cron_tick() FROM anon;
REVOKE ALL ON FUNCTION public.run_gameweek_cron_tick() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.run_gameweek_cron_tick() TO service_role;

COMMENT ON FUNCTION public.run_gameweek_cron_tick() IS
  'Runs the idempotent gameweek engine and reward settlement under a non-overlapping advisory lock.';

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  -- Idempotent installation: replace only our own named job.
  FOR v_job_id IN
    SELECT jobid
      FROM cron.job
     WHERE jobname = 'vct-gameweek-engine-5m'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'vct-gameweek-engine-5m',
    '*/5 * * * *',
    'SELECT public.run_gameweek_cron_tick();'
  );
END;
$$;

