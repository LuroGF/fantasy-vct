-- Prerequisites in Supabase Vault:
--   project_url     = https://YOUR_PROJECT_REF.supabase.co
--   vlr_sync_secret = the same VLR_SYNC_SECRET configured on the Edge Function

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  v_missing text[] := array[]::text[];
  v_job_id bigint;
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'project_url'
  ) then
    v_missing := array_append(v_missing, 'project_url');
  end if;

  if not exists (
    select 1 from vault.decrypted_secrets where name = 'vlr_sync_secret'
  ) then
    v_missing := array_append(v_missing, 'vlr_sync_secret');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Missing Supabase Vault secrets: %', array_to_string(v_missing, ', ');
  end if;

  for v_job_id in
    select jobid
    from cron.job
    where jobname in ('vct-vlr-matches-15m', 'vct-vlr-stats-5m')
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'vct-vlr-matches-15m',
    '*/15 * * * *',
    $cron$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'project_url'
        ) || '/functions/v1/vlr-sync?kind=matches',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'vlr_sync_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 150000
      ) AS request_id;
    $cron$
  );

  perform cron.schedule(
    'vct-vlr-stats-5m',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'project_url'
        ) || '/functions/v1/vlr-sync?kind=stats',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'vlr_sync_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 150000
      ) AS request_id;
    $cron$
  );
end;
$$;

select jobid, jobname, schedule, active
from cron.job
where jobname in ('vct-vlr-matches-15m', 'vct-vlr-stats-5m')
order by jobname;
