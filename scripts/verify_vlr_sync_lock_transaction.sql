begin;

create temp table _vlr_lock_test (
  first_run uuid,
  blocked_run uuid,
  second_run uuid
) on commit drop;

insert into _vlr_lock_test (first_run)
values (public.try_start_vct_sync_run('matches'));

update _vlr_lock_test
set blocked_run = public.try_start_vct_sync_run('matches');

do $$
begin
  if (select first_run is null from _vlr_lock_test) then
    raise exception 'TEST FAILED: first run did not acquire the lease';
  end if;

  if (select blocked_run is not null from _vlr_lock_test) then
    raise exception 'TEST FAILED: overlapping run was not blocked';
  end if;
end;
$$;

select public.finish_vct_sync_run(
  p_run_id := first_run,
  p_status := 'success',
  p_summary := '{"test":true}'::jsonb,
  p_errors := '[]'::jsonb
)
from _vlr_lock_test;

update _vlr_lock_test
set second_run = public.try_start_vct_sync_run('matches');

do $$
begin
  if (select second_run is null from _vlr_lock_test) then
    raise exception 'TEST FAILED: lease was not released after completion';
  end if;
end;
$$;

select public.finish_vct_sync_run(
  p_run_id := second_run,
  p_status := 'success',
  p_summary := '{"test":true}'::jsonb,
  p_errors := '[]'::jsonb
)
from _vlr_lock_test;

select jsonb_build_object(
  'status', 'passed',
  'first_run_acquired', true,
  'overlap_blocked', true,
  'lease_released', true,
  'persistence', 'none: transaction rolled back'
) AS test_result;

rollback;
