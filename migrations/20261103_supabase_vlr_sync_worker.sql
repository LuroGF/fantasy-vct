begin;

create table if not exists public.vct_sync_locks (
  sync_type text primary key check (sync_type in ('matches', 'stats')),
  run_id uuid references public.vct_sync_runs(id) on delete set null
    deferrable initially deferred,
  locked_until timestamp with time zone not null,
  updated_at timestamp with time zone not null default now()
);

alter table public.vct_sync_locks enable row level security;
revoke all on table public.vct_sync_locks from public, anon, authenticated;
grant all on table public.vct_sync_locks to service_role;

create or replace function public.try_start_vct_sync_run(p_sync_type text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_acquired_run_id uuid;
  v_previous_run_id uuid;
begin
  if p_sync_type not in ('matches', 'stats') then
    raise exception 'Unsupported VLR sync type: %', p_sync_type;
  end if;

  select lock.run_id
    into v_previous_run_id
    from public.vct_sync_locks lock
   where lock.sync_type = p_sync_type
     and lock.locked_until <= now();

  insert into public.vct_sync_locks (
    sync_type,
    run_id,
    locked_until,
    updated_at
  ) values (
    p_sync_type,
    v_run_id,
    now() + interval '10 minutes',
    now()
  )
  on conflict (sync_type) do update
    set run_id = excluded.run_id,
        locked_until = excluded.locked_until,
        updated_at = now()
    where public.vct_sync_locks.locked_until <= now()
  returning run_id into v_acquired_run_id;

  if v_acquired_run_id is null then
    return null;
  end if;

  if v_previous_run_id is not null then
    update public.vct_sync_runs
       set status = 'failed',
           finished_at = now(),
           errors = errors || '["Execution lease expired before completion"]'::jsonb
     where id = v_previous_run_id
       and status = 'running';
  end if;

  insert into public.vct_sync_runs (id, sync_type, status)
  values (v_run_id, p_sync_type, 'running');

  return v_run_id;
end;
$$;

create or replace function public.finish_vct_sync_run(
  p_run_id uuid,
  p_status text,
  p_summary jsonb default '{}'::jsonb,
  p_errors jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('success', 'warning', 'failed') then
    raise exception 'Unsupported VLR sync status: %', p_status;
  end if;

  update public.vct_sync_runs
     set status = p_status,
         finished_at = now(),
         summary = coalesce(p_summary, '{}'::jsonb),
         errors = coalesce(p_errors, '[]'::jsonb)
   where id = p_run_id
     and status = 'running';

  delete from public.vct_sync_locks
   where run_id = p_run_id;
end;
$$;

revoke all on function public.try_start_vct_sync_run(text)
  from public, anon, authenticated;
grant execute on function public.try_start_vct_sync_run(text)
  to service_role;

revoke all on function public.finish_vct_sync_run(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.finish_vct_sync_run(uuid, text, jsonb, jsonb)
  to service_role;

comment on function public.try_start_vct_sync_run(text) is
  'Atomically starts a VLR sync with a ten-minute non-overlapping lease.';
comment on function public.finish_vct_sync_run(uuid, text, jsonb, jsonb) is
  'Finishes a leased VLR sync run and releases its lock.';

commit;
