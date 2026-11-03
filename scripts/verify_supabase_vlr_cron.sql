select
  jobid,
  jobname,
  schedule,
  active
from cron.job
order by jobid;

select
  job.jobname,
  run.status,
  run.start_time,
  run.end_time,
  left(coalesce(run.return_message, ''), 300) AS return_message
from cron.job_run_details run
join cron.job job on job.jobid = run.jobid
where job.jobname in ('vct-vlr-matches-15m', 'vct-vlr-stats-5m')
order by run.start_time desc
limit 12;

select
  sync_type,
  status,
  started_at,
  finished_at,
  summary,
  errors
from public.vct_sync_runs
order by started_at desc
limit 12;
