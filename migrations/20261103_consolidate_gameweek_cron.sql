begin;

do $$
declare
  v_job_id bigint;
begin
  -- Replace both the legacy raw engine and the temporary five-minute wrapper
  -- with one protected one-minute tick. This keeps lineup locking precise and
  -- also settles completed rewards.
  for v_job_id in
    select jobid
    from cron.job
    where jobname in ('fantasy-gameweek-engine', 'vct-gameweek-engine-5m')
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'vct-gameweek-engine-1m',
    '* * * * *',
    'select public.run_gameweek_cron_tick();'
  );
end;
$$;

commit;

select jobid, jobname, schedule, active
from cron.job
order by jobid;
