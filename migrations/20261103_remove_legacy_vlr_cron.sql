begin;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname in ('fantasy-vlr-matches', 'fantasy-vlr-stats')
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

commit;

select jobid, jobname, schedule, active
from cron.job
order by jobid;
